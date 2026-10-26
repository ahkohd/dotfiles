import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from './store.ts';

async function until(path: string, alternative?: string) {
  const deadline = Date.now() + 7000;
  while (!existsSync(path) && !(alternative && existsSync(alternative))) {
    if (Date.now() > deadline) throw new Error(`worker did not reach ${path}`);
    await Bun.sleep(10);
  }
}

test('a second stale observer cannot unlink the replacement live lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'swe-lock-race-'));
  const storePath = join(root, 'store');
  const initial = openStore(storePath);
  await initial.init();
  await initial.close();
  const dead = Bun.spawn([process.execPath, '-e', 'process.exit(0)']);
  await dead.exited;
  await writeFile(join(storePath, '.orch.lock'), `${dead.pid}\n`);
  const script = join(root, 'writer.ts');
  await writeFile(script, `import { existsSync, writeFileSync } from 'node:fs';
import { openStore } from ${JSON.stringify(join(import.meta.dir, 'store.ts'))};
const [root, storePath, name] = process.argv.slice(2);
const signal = (suffix) => root + '/' + name + '.' + suffix;
const wait = (suffix) => { const deadline = Date.now() + 10000; while (!existsSync(signal(suffix))) { if (Date.now() > deadline) throw new Error('barrier expired'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); } };
const store = openStore(storePath, { onStaleLock() { writeFileSync(signal('observed'), ''); wait('go'); } });
try { await store.init(); writeFileSync(signal('acquired'), ''); wait('release'); await store.close(); }
catch (error) { writeFileSync(signal('rejected'), String(error)); process.exitCode = 1; }
`);
  const children = ['a', 'b'].map(name => Bun.spawn([process.execPath, script, root, storePath, name], { stdout: 'pipe', stderr: 'pipe' }));
  try {
    await Promise.all(['a', 'b'].map(name => until(join(root, `${name}.observed`))));
    await writeFile(join(root, 'a.go'), '');
    await until(join(root, 'a.acquired'));
    await writeFile(join(root, 'b.go'), '');
    await until(join(root, 'b.rejected'), join(root, 'b.acquired'));
    expect(existsSync(join(root, 'b.acquired'))).toBe(false);
    expect((await readFile(join(storePath, '.orch.lock'), 'utf8')).trim()).toBe(String(children[0]!.pid));
    await writeFile(join(root, 'a.release'), '');
    expect(await children[0]!.exited).toBe(0);
    expect(await children[1]!.exited).toBe(1);
  } finally {
    for (const child of children) { child.kill(); await child.exited; }
    await rm(root, { recursive: true, force: true });
  }
}, 15000);

test('a live takeover claim refuses a forced writer and a dead claim is recovered', async () => {
  const root = await mkdtemp(join(tmpdir(), 'swe-lock-claim-'));
  const first = openStore(root);
  const forced = openStore(root, { force: true });
  try {
    await first.init();
    const claim = join(root, '.orch.lock.takeover');
    await mkdir(claim);
    await writeFile(join(claim, String(process.pid)), '');
    await expect(forced.init()).rejects.toThrow('another writer');
    expect((await readFile(join(root, '.orch.lock'), 'utf8')).trim()).toBe(String(process.pid));
    await rm(claim, { recursive: true });
    const dead = Bun.spawn([process.execPath, '-e', 'process.exit(0)']);
    await dead.exited;
    await mkdir(claim);
    await writeFile(join(claim, String(dead.pid)), '');
    await first.close();
    expect(existsSync(join(root, '.orch.lock'))).toBe(false);
  } finally {
    await rm(join(root, '.orch.lock.takeover'), { recursive: true, force: true });
    await first.close();
    await forced.close();
    await rm(root, { recursive: true, force: true });
  }
});
