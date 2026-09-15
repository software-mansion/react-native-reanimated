import { scanSource } from './scanSource';
import type { DisplaySource, FnInfo } from './types';

const MAIN_NAME = 'main';
const IMPORT_START_PATTERN = /^\s*import\b/;
const IMPORT_END_PATTERN = /\bfrom\s+['"][^'"]+['"]\s*;?\s*$/;
const BARE_YIELD_PATTERN = /^\s*yield;\s*$/;
const CLOSING_BRACE_PATTERN = /^\s*}\s*$/;

export function displaySource(source: string): DisplaySource {
  const fns = scanSource(source);
  const main = fns.get(MAIN_NAME) ?? null;
  const hidden = [...fns.values()].filter((fn) => fn.isNative || fn.isHidden);
  const rawLines = source.split('\n');
  const displayLines: string[] = [];
  const rawToDisplayLine: number[] = [-1];
  let insideImport = false;

  rawLines.forEach((text, index) => {
    const line = index + 1;
    if (insideImport || IMPORT_START_PATTERN.test(text)) {
      insideImport = !IMPORT_END_PATTERN.test(text);
      rawToDisplayLine.push(-1);
      return;
    }
    if (isInside(hidden, line) || isMainBoundary(main, line)) {
      rawToDisplayLine.push(-1);
      return;
    }
    const blank = text.trim() === '';
    const previousBlank =
      displayLines.length === 0 ||
      displayLines[displayLines.length - 1].trim() === '';
    if (blank && previousBlank) {
      rawToDisplayLine.push(-1);
      return;
    }
    if (BARE_YIELD_PATTERN.test(text)) {
      rawToDisplayLine.push(displayLines.length);
      return;
    }
    if (
      CLOSING_BRACE_PATTERN.test(text) &&
      displayLines.length > 0 &&
      displayLines[displayLines.length - 1].endsWith('{') &&
      rawToDisplayLine[line - 1] === displayLines.length
    ) {
      displayLines[displayLines.length - 1] += '}';
      rawToDisplayLine.push(displayLines.length);
      return;
    }
    displayLines.push(transformLine(text, isInsideMain(main, line)));
    rawToDisplayLine.push(displayLines.length);
  });

  while (
    displayLines.length > 0 &&
    displayLines[displayLines.length - 1].trim() === ''
  ) {
    displayLines.pop();
  }

  const blockEnds = new Map<number, number>();
  for (const fn of fns.values()) {
    fn.yieldLines.forEach((start, index) => {
      const end = fn.yieldEnds[index];
      const displayStart = rawToDisplayLine[start] ?? -1;
      const displayEnd = rawToDisplayLine[end] ?? -1;
      if (end > start && displayStart > 0 && displayEnd > displayStart) {
        blockEnds.set(displayStart, displayEnd);
      }
    });
  }

  return {
    text: displayLines.join('\n') + '\n',
    rawToDisplayLine,
    blockEnds,
  };
}

function isInside(fns: FnInfo[], line: number): boolean {
  return fns.some((fn) => line >= fn.headerLine && line <= fn.endLine);
}

function isMainBoundary(main: FnInfo | null, line: number): boolean {
  return main !== null && (line === main.headerLine || line === main.endLine);
}

function isInsideMain(main: FnInfo | null, line: number): boolean {
  return main !== null && line > main.headerLine && line < main.endLine;
}

function transformLine(text: string, insideMain: boolean): string {
  let result = text;
  if (insideMain && result.startsWith('  ')) {
    result = result.slice(2);
  }
  result = result.replace(/^(\s*)export\s+(?:default\s+)?/, '$1');
  result = result.replace(/\bfunction\s*\*\s*/, 'function ');
  result = result.replace(/^(\s*)yield\s+/, '$1');
  result = result.replace(/=\s*yield\s+/, '= ');
  result = result.replace(/\breturn\s+yield\s+/, 'return ');
  return result;
}
