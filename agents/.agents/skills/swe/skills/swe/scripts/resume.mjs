#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
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
function verifyLinks(note, artifacts, contents = readFileSync(note.path, 'utf8')) {
  const mask = text => text.replace(/[^\n]/g, ' ');
  const text = contents
    .replace(/^ {0,3}((`|~)\2{2,}).*\n[\s\S]*?(?:^ {0,3}\1\2*[ \t]*$|(?![\s\S]))/gm, mask)
    .replace(/(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, mask);
  const links = [...text.matchAll(/\[[^\]]*\]\((?:<([^<>]+)>|([^)]+))\)/g)]
    .map(match => ({ match, destination: match[1] ?? match[2] }))
    .filter(link => !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(link.destination))
    .map(link => ({ ...link, path: realpathSync(resolve(dirname(note.path), decodeURIComponent(link.destination.split('#')[0]))) }));
  for (const artifact of artifacts) if (!links.some(link => link.path === artifact.path)) throw new Error(`note must link artifact: ${artifact.path}`);
  for (const { path } of links) if (path !== note.path && !artifacts.some(artifact => artifact.path === path)) throw new Error(`register local note link with --artifact: ${path}`);
  return links;
}
function checkedContents(record) {
  const contents = readFileSync(record.path);
  if (createHash('sha256').update(contents).digest('hex') !== record.sha256) throw new Error(`checkpoint file changed: ${record.path}`);
  return contents;
}
function snapshot(note, artifacts, directory) {
  let text = checkedContents(note).toString('utf8');
  const links = verifyLinks(note, artifacts, text);
  const savedNote = join(directory, 'resume.md');
  const destinations = new Map([[note.path, savedNote]]);
  const savedArtifacts = artifacts.map((artifact, index) => {
    const path = join(directory, `artifact-${index}-${basename(artifact.path)}`);
    writeFileSync(path, checkedContents(artifact), { flag: 'wx', mode: 0o600 });
    destinations.set(artifact.path, path);
    return file(path, [directory]);
  });
  for (const link of links.reverse()) {
    const fragment = link.destination.includes('#') ? link.destination.slice(link.destination.indexOf('#')) : '';
    const original = text.slice(link.match.index, link.match.index + link.match[0].length);
    const replacement = original.slice(0, original.lastIndexOf('](') + 2) + `<${encodeURIComponent(basename(destinations.get(link.path)))}${fragment}>)`;
    text = text.slice(0, link.match.index) + replacement + text.slice(link.match.index + link.match[0].length);
  }
  writeFileSync(savedNote, text, { flag: 'wx', mode: 0o600 });
  const saved = { note: file(savedNote, [directory]), artifacts: savedArtifacts };
  verifyLinks(saved.note, saved.artifacts);
  return saved;
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
    if (new Set([note.path, ...artifacts.map(item => item.path)]).size !== artifacts.length + 1) throw new Error('duplicate artifact');
    const directory = join(store, `checkpoint-${randomUUID()}`);
    const temporary = join(store, `.latest-${randomUUID()}.json`);
    mkdirSync(directory, { mode: 0o700 });
    let published = false;
    let record;
    try {
      const saved = snapshot(note, artifacts, directory);
      record = { schemaVersion: 1, project: identity, worktree: project, createdAt: new Date().toISOString(), ...saved };
      writeFileSync(temporary, JSON.stringify(record) + '\n', { flag: 'wx', mode: 0o600 });
      renameSync(temporary, pointer);
      published = true;
    } finally {
      if (!published) {
        rmSync(temporary, { force: true });
        rmSync(directory, { recursive: true, force: true });
      }
    }
    console.log(JSON.stringify({ kind: 'checkpoint', checkpoint: record }));
  }
} catch (error) {
  console.log(JSON.stringify({ kind: 'unavailable', detail: error.message }));
  process.exitCode = 1;
}
