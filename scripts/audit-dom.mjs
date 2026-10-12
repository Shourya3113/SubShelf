#!/usr/bin/env node
// Fails if src/ uses an unsafe DOM/code-execution sink. Cross-platform replacement for a grep one-liner.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SINKS = /(innerHTML\s*=\s*[^"'`])|insertAdjacentHTML|outerHTML|document\.write|eval\(|new Function/;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|js|html)$/.test(name) ? [path] : [];
  });

const hits = [];
for (const file of walk(join(ROOT, 'src'))) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (SINKS.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
  });
}

if (hits.length) {
  console.error('Unsafe DOM sinks found:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('DOM audit clean');
