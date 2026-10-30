import { scanSource } from './scanSource';
import type { DisplaySource, FnInfo } from './types';

const MAIN_NAME = 'main';
const IMPORT_START_PATTERN = /^\s*import\b/;
const IMPORT_END_PATTERN = /\bfrom\s+['"][^'"]+['"]\s*;?\s*$/;
const BARE_YIELD_PATTERN = /^\s*yield;\s*$/;
const CLOSING_BRACE_PATTERN = /^\s*}\s*$/;
const NAMED_IMPORT_PATTERN =
  /^\s*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/;
const MODULE_NAMES: Record<string, string> = {
  worklets: 'react-native-worklets',
  mocks: './mocks',
};
const SIMULATOR_ONLY_NAMES = new Set([
  'awaitPromise',
  'globalThis',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'clearInterval',
  'updateScreen',
  'setNativeProps',
  'sendToUIThread',
  'nextTick',
]);
const MAX_IMPORT_WIDTH = 80;

export interface DisplayOptions {
  boilerplate?: boolean;
}

export function displaySource(
  source: string,
  options: DisplayOptions = {}
): DisplaySource {
  const fns = scanSource(source);
  const main = fns.get(MAIN_NAME) ?? null;
  const hidden = [...fns.values()].filter((fn) => fn.isNative || fn.isHidden);
  const rawLines = source.split('\n');
  const displayLines: string[] = [];
  const rawToDisplayLine: number[] = [-1];
  const imports: string[] = [];
  let insideImport = false;

  rawLines.forEach((text, index) => {
    const line = index + 1;
    if (insideImport || IMPORT_START_PATTERN.test(text)) {
      if (!insideImport) {
        imports.push('');
      }
      imports[imports.length - 1] += `${text}\n`;
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

  if (options.boilerplate === true) {
    const body = displayLines.join('\n');
    const header = imports.flatMap((statement) =>
      displayImport(statement, body)
    );
    if (header.length > 0) {
      const offset = header.length + 1;
      displayLines.unshift(...header, '');
      for (let index = 1; index < rawToDisplayLine.length; index++) {
        if (rawToDisplayLine[index] > 0) {
          rawToDisplayLine[index] += offset;
        }
      }
    }
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

function displayImport(statement: string, body: string): string[] {
  const match = NAMED_IMPORT_PATTERN.exec(statement.replace(/\s+/g, ' '));
  if (match === null) {
    return statement.trimEnd().split('\n');
  }
  const names = match[1]
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
    .filter(
      (name) =>
        moduleKey(match[2]) !== 'worklets' || !SIMULATOR_ONLY_NAMES.has(name)
    )
    .filter((name) => new RegExp(`\\b${name}\\b`).test(body));
  if (names.length === 0) {
    return [];
  }
  const module = MODULE_NAMES[moduleKey(match[2])] ?? match[2];
  const single = `import { ${names.join(', ')} } from '${module}';`;
  if (single.length <= MAX_IMPORT_WIDTH) {
    return [single];
  }
  return [
    'import {',
    ...names.map((name) => `  ${name},`),
    `} from '${module}';`,
  ];
}

function moduleKey(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
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
  result = replaceAwaitCalls(result);
  return result;
}

function replaceAwaitCalls(text: string): string {
  const marker = 'awaitPromise(';
  let result = text;
  let start = result.indexOf(marker);
  while (start !== -1) {
    let depth = 0;
    let end = -1;
    for (
      let index = start + marker.length - 1;
      index < result.length;
      index++
    ) {
      const char = result[index];
      if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }
    if (end === -1) {
      break;
    }
    const inner = result.slice(start + marker.length, end);
    result = `${result.slice(0, start)}await ${inner}${result.slice(end + 1)}`;
    start = result.indexOf(marker);
  }
  return result;
}
