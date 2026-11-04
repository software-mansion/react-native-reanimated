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
  'heapVariable',
]);
const MAX_IMPORT_WIDTH = 80;
const STRING_OR_COMMENT_PATTERN =
  /('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\/\/.*$)/;
const HEAP_VARIABLE_PATTERN =
  /^(\s*)(?:const|let)\s+(\w+)\s*=\s*yield\s+heapVariable\(\s*['"][^'"]*['"]\s*,\s*(.*)\);\s*$/;

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
  const variables = rawLines.flatMap((text, index) => {
    const match = HEAP_VARIABLE_PATTERN.exec(text);
    if (match === null) {
      return [];
    }
    const name = match[2];
    const scope = innermostFunction(fns, index + 1);
    const start = scope?.headerLine ?? 1;
    const end = scope?.endLine ?? rawLines.length;
    const shadows = [...fns.values()].filter(
      (fn) =>
        fn !== scope &&
        fn.headerLine > start &&
        fn.endLine <= end &&
        redeclares(rawLines, fn, name)
    );
    return [{ name, start, end, shadows }];
  });
  const asyncHeaders = new Set(
    [...fns.values()]
      .filter((fn) =>
        fn.yieldLines.some((line, index) =>
          rawLines
            .slice(line - 1, fn.yieldEnds[index])
            .join('\n')
            .includes('awaitPromise(')
        )
      )
      .map((fn) => fn.headerLine)
  );
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
    if (blank && (previousBlank || isInsideBody(rawLines, index, main))) {
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
    const transformed = transformLine(
      text,
      isInsideMain(main, line),
      variables
        .filter(
          (variable) =>
            line >= variable.start &&
            line <= variable.end &&
            !variable.shadows.some(
              (fn) => line >= fn.headerLine && line <= fn.endLine
            )
        )
        .map((variable) => variable.name)
    );
    displayLines.push(
      asyncHeaders.has(line)
        ? transformed.replace(/\bfunction\b/, 'async function')
        : transformed
    );
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
  const key = moduleKey(match[2]);
  const reactHooks =
    key === 'react' &&
    names.every((name) => name === 'useState' || name === 'useEffect');
  const module = reactHooks ? 'react' : (MODULE_NAMES[key] ?? match[2]);
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

function isInsideBody(
  rawLines: string[],
  blankIndex: number,
  main: FnInfo | null
): boolean {
  const nextIndex = rawLines.findIndex(
    (text, index) => index > blankIndex && text.trim() !== ''
  );
  if (nextIndex === -1) {
    return false;
  }
  const next = rawLines[nextIndex];
  const indent = next.length - next.trimStart().length;
  const bodyIndent = isInsideMain(main, nextIndex + 1) ? 4 : 2;
  return indent >= bodyIndent && !next.trimStart().startsWith('//');
}

function redeclares(rawLines: string[], fn: FnInfo, name: string): boolean {
  const header = rawLines[fn.headerLine - 1] ?? '';
  const params = header.slice(header.indexOf('(') + 1, header.lastIndexOf(')'));
  const binding = new RegExp(`(?<![\\w$.])${name}(?![\\w$])`);
  if (binding.test(params)) {
    return true;
  }
  const declaration = new RegExp(`^\\s*(?:const|let|var)\\s+${name}(?![\\w$])`);
  return rawLines
    .slice(fn.headerLine, fn.endLine - 1)
    .some((text) => declaration.test(text));
}

function innermostFunction(
  fns: Map<string, FnInfo>,
  line: number
): FnInfo | undefined {
  return [...fns.values()]
    .filter((fn) => line >= fn.headerLine && line <= fn.endLine)
    .sort((a, b) => b.headerLine - a.headerLine)[0];
}

function isMainBoundary(main: FnInfo | null, line: number): boolean {
  return main !== null && (line === main.headerLine || line === main.endLine);
}

function isInsideMain(main: FnInfo | null, line: number): boolean {
  return main !== null && line > main.headerLine && line < main.endLine;
}

function transformLine(
  text: string,
  insideMain: boolean,
  variables: string[]
): string {
  let result = text.replace(HEAP_VARIABLE_PATTERN, '$1let $2 = $3;');
  for (const name of variables) {
    result = replaceInCode(
      result,
      new RegExp(`(?<![\\w$.])${name}\\.value\\b`, 'g'),
      name
    );
  }
  if (insideMain && result.startsWith('  ')) {
    result = result.slice(2);
  }
  result = result.replace(/^(\s*)export\s+(?:default\s+)?/, '$1');
  result = result.replace(/\bfunction\s*\*\s*/, 'function ');
  result = result.replace(/^(\s*)yield\s+/, '$1');
  result = result.replace(/^(\s*if\s*\()\s*yield\s+/, '$1');
  result = result.replace(/=\s*yield\s+/, '= ');
  result = result.replace(/\breturn\s+yield\s+/, 'return ');
  result = replaceAwaitCalls(result);
  return result;
}

function replaceInCode(
  text: string,
  pattern: RegExp,
  replacement: string
): string {
  return text
    .split(STRING_OR_COMMENT_PATTERN)
    .map((part, index) =>
      index % 2 === 0
        ? part.replace(pattern, replacement)
        : part.startsWith('`')
          ? part.replace(
              /\$\{([^}]*)\}/g,
              (_, inner: string) => `\${${inner.replace(pattern, replacement)}}`
            )
          : part
    )
    .join('');
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
