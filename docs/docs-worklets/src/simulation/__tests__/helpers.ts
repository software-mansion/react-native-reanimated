import type { SnippetModule } from '../types';

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
