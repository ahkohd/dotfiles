#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const bundled = resolve(dirname(fileURLToPath(import.meta.url)), '../playbooks');
const normalize = text => text.replace(/\s+/g, ' ').trim();

export function checkPlaybooks(root, bases = bundled) {
  const directory = join(root, '.agents/playbooks');
  if (!existsSync(directory)) return [];
  const problems = [];
  for (const name of readdirSync(directory).filter(name => name.endsWith('.md')).sort()) {
    const path = join(directory, name);
    const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
    const front = text.match(/^---\n([\s\S]*?)\n---\n/);
    const fields = key => [...(front?.[1] ?? '').matchAll(new RegExp(`^${key}:[ \\t]*(.*)$`, 'gm'))];
    if (!front || fields('extends').length !== 1 || fields('when').length !== 1 || !fields('when')[0][1].trim()) {
      problems.push(`${path}: require frontmatter with one extends: and one nonempty when: field`);
      continue;
    }
    const stems = fields('extends')[0][1].split(',').map(value => value.trim()).filter(Boolean);
    const texts = [];
    for (const stem of stems) {
      const base = join(bases, `${stem}.md`);
      if (!/^[a-z][a-z0-9-]*$/.test(stem) || !existsSync(base)) {
        problems.push(`${path}: unknown bundled playbook ${stem}`);
      } else {
        texts.push(normalize(readFileSync(base, 'utf8')));
      }
    }
    for (const line of text.slice(front[0].length).split('\n')) {
      if (!/^\s*(?:[-*]|\d+\.)\s+\*\*(?:After|Before|Replace|In)\*\*/.test(line)) continue;
      const anchor = line.match(/\*\*(?:After|Before|Replace|In)\*\*\s+"([^"]+)"/)?.[1];
      const needle = anchor && normalize(anchor);
      const matches = needle ? texts.reduce((sum, text) => sum + text.split(needle).length - 1, 0) : 0;
      if (matches !== 1) problems.push(`${path}: change needs exactly one matching straight-quoted anchor: ${line.trim()}`);
    }
  }
  return problems;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(process.argv[2] ?? '.');
    if (!statSync(root).isDirectory()) throw new Error('project root must be a directory');
    const problems = checkPlaybooks(root);
    if (problems.length) throw new Error(problems.join('\n'));
    console.log('Project playbook anchors validated.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
