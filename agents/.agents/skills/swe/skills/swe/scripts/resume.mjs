#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

function inside(root, path) {
  const tail = relative(root, path);
  return tail === '' || (!isAbsolute(tail) && tail !== '..' && !tail.startsWith(`..${sep}`));
}
function file(path, roots) {
  if (typeof path !== 'string' || !path) throw new Error('missing file path');
  const canonical = realpathSync(path);
  if (!roots.some(root => inside(root, canonical)) || !statSync(canonical).isFile()) throw new Error('checkpoint file is outside its approved roots');
  return { path: canonical, sha256: createHash('sha256').update(readFileSync(canonical)).digest('hex') };
}
function verify(record, roots) {
  const current = file(record?.path, roots);
  if (current.sha256 !== record.sha256) throw new Error(`checkpoint file changed: ${current.path}`);
  return current;
}
function verifyLinks(note, artifacts) {
  const text = readFileSync(note.path, 'utf8')
    .replace(/^ {0,3}((`|~)\2{2,}).*\n[\s\S]*?(?:^ {0,3}\1\2*[ \t]*$|(?![\s\S]))/gm, ' ')
    .replace(/(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, ' ');
  const links = [...text.matchAll(/\[[^\]]*\]\((?:<([^<>]+)>|([^)]+))\)/g)]
    .map(match => match[1] ?? match[2]).filter(path => !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(path))
    .map(path => realpathSync(resolve(dirname(note.path), decodeURIComponent(path.split('#')[0]))));
  for (const artifact of artifacts) if (!links.includes(artifact.path)) throw new Error(`note must link artifact: ${artifact.path}`);
  for (const path of links) if (path !== note.path && !artifacts.some(artifact => artifact.path === path)) throw new Error(`register local note link with --artifact: ${path}`);
}

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    project: { type: 'string', default: '.' }, store: { type: 'string' }, note: { type: 'string' }, artifact: { type: 'string', multiple: true, default: [] },
  } });
  const [operation] = positionals;
  if (positionals.length !== 1 || !['begin', 'publish', 'read'].includes(operation)) throw new Error('usage: resume.mjs begin|publish|read --project <directory> [--store <durable-directory>] [--note <file> --artifact <file> ...]');
  if (operation !== 'publish' && (values.note || values.artifact.length)) throw new Error('only publish accepts files');
  const project = realpathSync(values.project);
  if (!statSync(project).isDirectory()) throw new Error('project must be a directory');
  let identity;
  try {
    identity = realpathSync(execFileSync('git', ['-C', project, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
  } catch {
    if (!values.store) throw new Error('non-Git projects require an explicit durable --store on every invocation');
    identity = project;
  }
  const location = values.store ? resolve(values.store) : join(identity, 'swe', 'resume');
  const pointer = join(location, 'latest.json');
  if (operation === 'read') {
    try {
      lstatSync(pointer);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      console.log(JSON.stringify({ kind: 'missing', store: location }));
      process.exit(2);
    }
  }
  if (operation !== 'read') mkdirSync(location, { recursive: true, mode: 0o700 });
  const store = realpathSync(location);
  if (!values.store && !inside(identity, store)) throw new Error('checkpoint store escapes project metadata');
  const roots = [store, project];
  const load = () => {
    file(pointer, [store]);
    const record = JSON.parse(readFileSync(pointer, 'utf8'));
    if (record.schemaVersion !== 1 || record.project !== identity || !Array.isArray(record.artifacts)) throw new Error('invalid checkpoint or project mismatch');
    if (!Number.isFinite(Date.parse(record.createdAt))) throw new Error('invalid checkpoint timestamp');
    const artifactRoots = [...roots];
    if (typeof record.worktree === 'string' && record.worktree !== project) {
      try {
        const original = realpathSync(record.worktree);
        const originalIdentity = realpathSync(execFileSync('git', ['-C', original, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
        if (originalIdentity === identity) artifactRoots.push(original);
      } catch {}
    }
    const note = verify(record.note, [store]);
    const artifacts = record.artifacts.map(item => verify(item, artifactRoots));
    verifyLinks(note, artifacts);
    return { ...record, note, artifacts };
  };
  if (operation === 'begin') {
    const directory = join(store, randomUUID());
    mkdirSync(directory, { mode: 0o700 });
    console.log(JSON.stringify({ kind: 'directory', directory, store }));
  } else if (operation === 'read') {
    console.log(JSON.stringify({ kind: 'checkpoint', checkpoint: load() }));
  } else {
    const note = file(values.note, [store]);
    const artifacts = values.artifact.map(path => file(path, roots));
    if (new Set(artifacts.map(item => item.path)).size !== artifacts.length) throw new Error('duplicate artifact');
    verifyLinks(note, artifacts);
    const record = { schemaVersion: 1, project: identity, worktree: project, createdAt: new Date().toISOString(), note, artifacts };
    const temporary = join(store, `.latest-${randomUUID()}.json`);
    try {
      writeFileSync(temporary, JSON.stringify(record) + '\n', { flag: 'wx', mode: 0o600 });
      renameSync(temporary, pointer);
    } finally {
      rmSync(temporary, { force: true });
    }
    console.log(JSON.stringify({ kind: 'checkpoint', checkpoint: load() }));
  }
} catch (error) {
  console.log(JSON.stringify({ kind: 'unavailable', detail: error.message }));
  process.exitCode = 1;
}
