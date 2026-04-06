#!/usr/bin/env node

const fs = require('node:fs');

function chooseRandomItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }

  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function slugify(text = '') {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function maybeReadFile(path) {
  if (!path) {
    return '';
  }

  try {
    return await fs.promises.readFile(path, 'utf8');
  } catch {
    return '';
  }
}

async function main() {
  const files = process.argv.slice(2);
  const seed = Date.now();
  const topic = chooseRandomItem(['mountains', 'rivers', 'orbits', 'algorithms', 'coffee']);
  const slug = slugify(topic);

  console.log(`Review test ${seed}: ${slug}`);

  const body = await maybeReadFile(files[0]);
  if (body) {
    console.log(`Loaded file length: ${body.length}`);
  } else {
    console.log('No file provided or file could not be read.');
  }
}

main().catch((error) => {
  console.error('Failed to run sample:', error);
  process.exit(1);
});
