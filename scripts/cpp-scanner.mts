const CLOSING: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>',
};

export function findCalls(source: string, name: string): number[] {
  const calls: number[] = [];
  const identifier = new RegExp(`\\b${name}\\b`, 'y');
  for (let index = 0; index < source.length; index++) {
    const skipped = skipStringOrComment(source, index);
    if (skipped !== undefined) {
      index = skipped;
      continue;
    }
    identifier.lastIndex = index;
    if (identifier.test(source)) {
      calls.push(index);
    }
  }
  return calls;
}

// Splits the bracketed list that opens at `start` on its top-level commas, so
// `(a, f(b, c))` gives `a` and `f(b, c)`. Commas inside nested brackets,
// strings and comments don't split, and comments turn into spaces.
export function splitTopLevel(
  text: string,
  start: number,
  opening = '([{'
): string[] {
  const end = findClosingBracket(text, start, opening);
  const parts: string[] = [];
  let part = '';
  for (let index = start + 1; index < end; index++) {
    const char = text[index];
    const skipped = skipStringOrComment(text, index);
    if (char === ',') {
      parts.push(part.trim());
      part = '';
    } else if (skipped !== undefined) {
      part += char === '/' ? ' ' : text.slice(index, skipped + 1);
      index = skipped;
    } else if (opening.includes(char)) {
      const closing = findClosingBracket(text, index, opening);
      part += text.slice(index, closing + 1);
      index = closing;
    } else {
      part += char;
    }
  }
  const last = part.trim();
  return last ? [...parts, last] : parts;
}

export function findClosingBracket(
  text: string,
  start: number,
  opening = '([{'
): number {
  const expected: string[] = [];
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    const skipped = skipStringOrComment(text, index);
    if (skipped !== undefined) {
      index = skipped;
    } else if (opening.includes(char)) {
      expected.push(CLOSING[char]);
    } else if (char === expected.at(-1)) {
      expected.pop();
      if (expected.length === 0) {
        return index;
      }
    }
  }
  throw new Error(
    `Found no closing bracket for \`${text.slice(start, start + 40)}\`.`
  );
}

function skipStringOrComment(text: string, start: number): number | undefined {
  const char = text[start];
  if (char === '"' || char === "'") {
    return skipString(text, start);
  }
  if (text.startsWith('//', start)) {
    const end = text.indexOf('\n', start);
    return end === -1 ? text.length : end;
  }
  if (text.startsWith('/*', start)) {
    const end = text.indexOf('*/', start + 2);
    return end === -1 ? text.length : end + 1;
  }
  return undefined;
}

function skipString(text: string, start: number): number {
  const quote = text[start];
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === '\\') {
      index++;
    } else if (text[index] === quote) {
      return index;
    }
  }
  return text.length;
}
