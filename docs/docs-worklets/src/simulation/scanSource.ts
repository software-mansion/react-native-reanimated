import { SnippetError } from './errors';
import type { FnInfo } from './types';

const HEADER_PATTERN =
  /^\s*(?:export\s+(?:default\s+)?)?function\s*\*\s*([A-Za-z_$][\w$]*)\s*\(/;
const NATIVE_DIRECTIVE_PATTERN = /^\s*'native';\s*$/;
const HIDDEN_DIRECTIVE_PATTERN = /^\s*'hidden';\s*$/;
const LOOP_PATTERN = /^\s*(?:for|while)\s*\(/;
const YIELD_PATTERN =
  /^\s*(?:return\s+)?(?:(?:const|let|var)\s+)?(?:[\w$.[\]{},\s]+?\s*=\s*)?yield\b/;

export function scanSource(source: string): Map<string, FnInfo> {
  const fns = new Map<string, FnInfo>();
  const lines = source.split('\n');
  const stack: { info: FnInfo; depth: number }[] = [];

  lines.forEach((text, index) => {
    const line = index + 1;
    const header = HEADER_PATTERN.exec(text);
    if (header !== null) {
      const info: FnInfo = {
        name: header[1],
        headerLine: line,
        endLine: line,
        yieldLines: [],
        yieldEnds: [],
        isNative: false,
        isHidden: false,
        hasLoop: false,
      };
      if (fns.has(info.name)) {
        throw new SnippetError(`duplicate function ${info.name}`, line);
      }
      fns.set(info.name, info);
      const depth = bracketDelta(text, '{', '}');
      if (depth <= 0) {
        info.endLine = line;
      } else {
        stack.push({ info, depth });
      }
      return;
    }
    const top = stack[stack.length - 1];
    if (top === undefined) {
      if (YIELD_PATTERN.test(text)) {
        throw new SnippetError('yield outside of a snippet function', line);
      }
      return;
    }
    const current = top.info;
    if (YIELD_PATTERN.test(text)) {
      current.yieldLines.push(line);
      current.yieldEnds.push(statementEnd(lines, index));
    }
    if (NATIVE_DIRECTIVE_PATTERN.test(text)) {
      current.isNative = true;
    }
    if (HIDDEN_DIRECTIVE_PATTERN.test(text)) {
      current.isHidden = true;
    }
    if (LOOP_PATTERN.test(text)) {
      current.hasLoop = true;
    }
    top.depth += bracketDelta(text, '{', '}');
    if (top.depth <= 0) {
      current.endLine = line;
      stack.pop();
    }
  });

  const open = stack[stack.length - 1];
  if (open !== undefined) {
    throw new SnippetError(
      `unterminated function ${open.info.name}`,
      open.info.headerLine
    );
  }
  return fns;
}

function statementEnd(lines: string[], startIndex: number): number {
  let depth = 0;
  for (let index = startIndex; index < lines.length; index++) {
    const text = lines[index];
    depth +=
      bracketDelta(text, '(', ')') +
      bracketDelta(text, '[', ']') +
      bracketDelta(text, '{', '}');
    if (depth <= 0 && /;\s*$/.test(text)) {
      return index + 1;
    }
  }
  return startIndex + 1;
}

function bracketDelta(text: string, open: string, close: string): number {
  let delta = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote !== null) {
      if (char === '\\') {
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '/' && text[i + 1] === '/') {
      break;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === open) {
      delta++;
    } else if (char === close) {
      delta--;
    }
  }
  return delta;
}
