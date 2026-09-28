import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { globSync } from 'glob';

import type { SnippetModule } from '../types';

const ROOT = join(__dirname, '..', '..', '..');

export function snippetPath(name: string): string {
  const path = globSync(
    [`src/simulation/snippets/${name}.{js,jsx}`, `docs/**/_*/${name}.{js,jsx}`],
    { cwd: ROOT, absolute: true }
  )[0];
  if (path === undefined) {
    throw new Error(`snippet ${name} not found`);
  }
  return path;
}

export function snippetSource(name: string): string {
  return readFileSync(snippetPath(name), 'utf8');
}

export function unindent(source: string): string {
  const lines = source.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim() !== '')
      .map((line) => line.length - line.trimStart().length)
  );
  return lines.map((line) => line.slice(indent)).join('\n') + '\n';
}

export function asModule(exports: Record<string, unknown>): SnippetModule {
  return exports as unknown as SnippetModule;
}
