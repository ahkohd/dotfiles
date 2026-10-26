import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPlaybooks } from './check-playbooks.mjs';

const scripts = dirname(fileURLToPath(import.meta.url));
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'swe-workflow-'));
  try { return run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
function resume(root, command, args = [], status = 0, store = undefined) {
  const result = spawnSync(process.execPath, [join(scripts, 'resume.mjs'), command, '--project', root, ...(store ? ['--store', store] : []), ...args], { encoding: 'utf8' });
  assert.equal(result.status, status, result.stdout + result.stderr);
  return JSON.parse(result.stdout);
}
function repository(root) {
  execFileSync('git', ['init', '-q', '-b', 'main', root]);
}

test('checkpoint publishes and cold-reads exact requested material', () => fixture(root => {
  repository(root);
  assert.equal(resume(root, 'read', [], 2).kind, 'missing');
  const { directory } = resume(root, 'begin');
  const note = join(directory, 'resume.md');
  const artifact = join(directory, 'ten questions.txt');
  const requested = Array.from({ length: 10 }, (_, i) => `${i + 1}. Exact question ${i + 1}?`).join('\n');
  writeFileSync(artifact, requested);
  writeFileSync(note, '[Questions](<ten questions.txt>)\n');
  resume(root, 'publish', ['--note', note, '--artifact', artifact]);
  const read = resume(root, 'read');
  assert.equal(readFileSync(read.checkpoint.artifacts[0].path, 'utf8'), requested);
  writeFileSync(artifact, 'changed');
  assert.equal(readFileSync(resume(root, 'read').checkpoint.artifacts[0].path, 'utf8'), requested);
  writeFileSync(read.checkpoint.artifacts[0].path, 'tampered snapshot');
  assert.equal(resume(root, 'read', [], 1).kind, 'unavailable');
}));

test('failed publication leaves the prior complete pointer untouched', () => fixture(root => {
  repository(root);
  const first = resume(root, 'begin');
  const note = join(first.directory, 'resume.md');
  writeFileSync(note, 'first complete checkpoint');
  const published = resume(root, 'publish', ['--note', note]);
  const second = resume(root, 'begin');
  const bad = join(second.directory, 'resume.md');
  writeFileSync(bad, '[missing](missing.txt)');
  assert.equal(resume(root, 'publish', ['--note', bad], 1).kind, 'unavailable');
  assert.equal(resume(root, 'read').checkpoint.note.path, published.checkpoint.note.path);
}));

test('unlinked artifacts and files outside project roots are rejected', () => fixture(root => {
  repository(root);
  const { directory } = resume(root, 'begin');
  const note = join(directory, 'resume.md');
  const artifact = join(directory, 'questions.txt');
  writeFileSync(note, 'No artifact link.');
  writeFileSync(artifact, 'required');
  assert.equal(resume(root, 'publish', ['--note', note, '--artifact', artifact], 1).kind, 'unavailable');
  fixture(other => {
    const outside = join(other, 'outside.txt');
    writeFileSync(outside, 'outside');
    writeFileSync(note, `[outside](${outside})`);
    assert.equal(resume(root, 'publish', ['--note', note, '--artifact', outside], 1).kind, 'unavailable');
  });
}));

test('non-Git projects require an explicit store and reject another project checkpoint', () => fixture(root => {
  assert.equal(resume(root, 'begin', [], 1).kind, 'unavailable');
  fixture(store => {
    const { directory } = resume(root, 'begin', [], 0, store);
    const note = join(directory, 'resume.md');
    writeFileSync(note, 'durable content');
    resume(root, 'publish', ['--note', note], 0, store);
    assert.equal(resume(root, 'read', [], 0, store).kind, 'checkpoint');
    fixture(other => assert.equal(resume(other, 'read', [], 1, store).kind, 'unavailable'));
  });
}));

test('dangling checkpoint pointers are unavailable, not missing', () => fixture(root => {
  repository(root);
  const { store } = resume(root, 'begin');
  symlinkSync(join(store, 'deleted.json'), join(store, 'latest.json'));
  assert.equal(resume(root, 'read', [], 1).kind, 'unavailable');
}));

test('code examples do not create artifact dependencies', () => fixture(root => {
  repository(root);
  const { directory } = resume(root, 'begin');
  const note = join(directory, 'resume.md');
  writeFileSync(note, '`[example](not-real.txt)`\n\n```text\n[example](also-not-real.txt)\n```\n');
  resume(root, 'publish', ['--note', note]);
  assert.equal(resume(root, 'read').kind, 'checkpoint');
}));

test('project playbook command fails on an invalid local override', () => fixture(root => {
  const projects = join(root, '.agents/playbooks');
  mkdirSync(projects, { recursive: true });
  writeFileSync(join(projects, 'custom.md'), '---\nextends: feature\nwhen: Building a feature\n---\n- **Before** "nonexistent bundled step" verify.\n');
  const result = spawnSync(process.execPath, [join(scripts, 'check-playbooks.mjs'), root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /exactly one matching/);
}));

test('Git worktrees share the checkpoint locator', () => fixture(root => {
  repository(root);
  execFileSync('git', ['-C', root, '-c', 'commit.gpgsign=false', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture']);
  const child = join(root, 'child');
  execFileSync('git', ['-C', root, 'worktree', 'add', '-qb', 'child', child]);
  const { directory } = resume(child, 'begin');
  const note = join(directory, 'resume.md');
  const artifact = join(child, 'requested.txt');
  writeFileSync(artifact, 'original worktree artifact');
  writeFileSync(note, `[Requested material](${artifact})`);
  const published = resume(child, 'publish', ['--note', note, '--artifact', artifact]);
  assert.equal(resume(root, 'read').checkpoint.note.path, published.checkpoint.note.path);
  const sibling = join(root, 'sibling');
  execFileSync('git', ['-C', root, 'worktree', 'add', '-qb', 'sibling', sibling]);
  rmSync(child, { recursive: true });
  assert.equal(readFileSync(resume(sibling, 'read').checkpoint.artifacts[0].path, 'utf8'), 'original worktree artifact');
}));

function publishWithRenameHook(root, note, artifact, hookBody, expectedStatus) {
  const hook = join(root, 'rename-hook.cjs');
  writeFileSync(hook, `const fs = require('node:fs');
const original = fs.renameSync;
fs.renameSync = function(from, to) {
  if (String(to).endsWith('/latest.json')) { ${hookBody} }
  return original.apply(this, arguments);
};
require('node:module').syncBuiltinESMExports();
`);
  const result = spawnSync(process.execPath, [join(scripts, 'resume.mjs'), 'publish', '--project', root, '--note', note, '--artifact', artifact], {
    encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: `--require=${hook}` }, timeout: 5000,
  });
  assert.equal(result.status, expectedStatus, result.stdout + result.stderr);
  return JSON.parse(result.stdout);
}

test('publication snapshots bytes before a source artifact changes at pointer replacement', () => fixture(root => {
  repository(root);
  const first = resume(root, 'begin');
  const oldNote = join(first.directory, 'resume.md');
  writeFileSync(oldNote, 'previous checkpoint');
  const previous = resume(root, 'publish', ['--note', oldNote]);
  const { directory } = resume(root, 'begin');
  const note = join(directory, 'resume.md');
  const artifact = join(directory, 'questions.txt');
  writeFileSync(note, '[Questions `exact`](questions.txt#section)\n`[example](not-real)`\n');
  writeFileSync(artifact, 'exact requested material');
  const published = publishWithRenameHook(root, note, artifact, `fs.writeFileSync(${JSON.stringify(artifact)}, 'concurrent source edit');`, 0);
  const read = resume(root, 'read');
  assert.deepEqual(read.checkpoint, published.checkpoint);
  assert.equal(readFileSync(read.checkpoint.artifacts[0].path, 'utf8'), 'exact requested material');
  assert.match(readFileSync(read.checkpoint.note.path, 'utf8'), /\[Questions `exact`\]\(<artifact-0-questions.txt#section>\)/);
  assert.match(readFileSync(read.checkpoint.note.path, 'utf8'), /`\[example\]\(not-real\)`/);
  assert.equal(readFileSync(previous.checkpoint.note.path, 'utf8'), 'previous checkpoint');
}));

test('failed pointer replacement preserves the previous checkpoint byte for byte', () => fixture(root => {
  repository(root);
  const { directory, store } = resume(root, 'begin');
  const note = join(directory, 'resume.md');
  const artifact = join(directory, 'questions.txt');
  writeFileSync(note, '[Questions](questions.txt)');
  writeFileSync(artifact, 'prior material');
  resume(root, 'publish', ['--note', note, '--artifact', artifact]);
  const before = readFileSync(join(store, 'latest.json'), 'utf8');
  writeFileSync(artifact, 'next material');
  assert.equal(publishWithRenameHook(root, note, artifact, "throw new Error('injected rename failure');", 1).kind, 'unavailable');
  assert.equal(readFileSync(join(store, 'latest.json'), 'utf8'), before);
  assert.equal(readFileSync(resume(root, 'read').checkpoint.artifacts[0].path, 'utf8'), 'prior material');
}));

test('a concurrent publisher cannot change the first publishers returned checkpoint', () => fixture(root => {
  repository(root);
  const { directory } = resume(root, 'begin');
  const note = join(directory, 'resume.md');
  const artifact = join(directory, 'questions.txt');
  writeFileSync(note, '[Questions](questions.txt)');
  writeFileSync(artifact, 'first material');
  const second = resume(root, 'begin');
  const secondNote = join(second.directory, 'resume.md');
  writeFileSync(secondNote, 'second material');
  const hookBody = `original.apply(this, arguments);
fs.writeFileSync(${JSON.stringify(artifact)}, 'changed source');
const env = {...process.env}; delete env.NODE_OPTIONS;
require('node:child_process').execFileSync(process.execPath, ${JSON.stringify([join(scripts, 'resume.mjs'), 'publish', '--project', root, '--note', secondNote])}, {env});
return;`;
  const first = publishWithRenameHook(root, note, artifact, hookBody, 0);
  assert.equal(readFileSync(first.checkpoint.artifacts[0].path, 'utf8'), 'first material');
  assert.equal(readFileSync(resume(root, 'read').checkpoint.note.path, 'utf8'), 'second material');
}));

test('project overrides reject stale, ambiguous, malformed and unknown anchors', () => fixture(root => {
  const bases = join(root, 'bases');
  const projects = join(root, '.agents/playbooks');
  mkdirSync(bases);
  mkdirSync(projects, { recursive: true });
  writeFileSync(join(bases, 'feature.md'), '1. Verify the behaviour.\n2. Stop at the gate.\n');
  const target = join(projects, 'custom.md');
  for (const [text, passes] of [
    ['---\nextends: feature\nwhen: Changing a feature\n---\n- **After** "Verify the behaviour." add project checks.', true],
    ['---\nextends:\nwhen: A standalone request\n---\n1. Observe the result.', true],
    ['---\nextends: missing\nwhen: Any task\n---\n', false],
    ['---\nextends: ../feature\nwhen: Any task\n---\n', false],
    ['---\nextends: feature\nwhen: Any task\n---\n- **Replace** "Old deleted step" with checks.', false],
    ['---\nextends: feature\nwhen: Any task\n---\n- **After** no quoted anchor.', false],
    ['---\nextends: feature, feature\nwhen: Any task\n---\n- **After** "Verify the behaviour." extra.', false],
    ['No frontmatter', false],
  ]) {
    writeFileSync(target, text);
    assert.equal(checkPlaybooks(root, bases).length === 0, passes, text);
  }
}));
