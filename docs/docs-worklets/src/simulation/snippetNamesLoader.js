const YIELD_PATTERN =
  /^\s*(?:(?:return\s+)?(?:(?:const|let|var)\s+)?(?:[\w$.[\]{},\s]+?\s*=\s*)?|if\s*\(\s*)yield\b/;
const HEADER_PATTERN =
  /^\s*(?:export\s+(?:default\s+)?)?function\s*\*\s*([A-Za-z_$][\w$]*)\s*\(/;

module.exports = function snippetNamesLoader(source) {
  const lines = source.split('\n');
  const stack = [];
  const insertAfter = new Map();
  const pinAfter = (index, name) => {
    const list = insertAfter.get(index) ?? [];
    list.push(name);
    insertAfter.set(index, list);
  };

  lines.forEach((text, index) => {
    const header = HEADER_PATTERN.exec(text);
    if (header !== null) {
      const depth = bracketDelta(text);
      if (depth > 0) {
        stack.push({ name: header[1], depth });
      } else {
        pinAfter(index, header[1]);
      }
      return;
    }
    const top = stack[stack.length - 1];
    if (top === undefined) {
      return;
    }
    top.depth += bracketDelta(text);
    if (top.depth <= 0) {
      stack.pop();
      pinAfter(index, top.name);
    }
  });

  const output = lines.map((text, index) => {
    const marked = startsStatement(lines, index)
      ? markYieldLine(text, index + 1)
      : isBracelessBody(lines, index)
        ? markBracelessYieldLine(text, index + 1)
        : text;
    const names = insertAfter.get(index);
    return names === undefined ? marked : `${marked}\n${pin(names)}`;
  });
  return `${output.join('\n')}\n`;
};

module.exports.YIELD_PATTERN = YIELD_PATTERN;

function startsStatement(lines, index) {
  for (let previous = index - 1; previous >= 0; previous--) {
    const code = lines[previous].replace(/\/\/.*$/, '').trim();
    if (code !== '') {
      return /[;{}]$/.test(code) || /^(?:case\b.*|default\s*):$/.test(code);
    }
  }
  return true;
}

function isBracelessBody(lines, index) {
  for (let previous = index - 1; previous >= 0; previous--) {
    const code = lines[previous].replace(/\/\/.*$/, '').trim();
    if (code !== '') {
      return /^(?:\}\s*)?(?:else|(?:else\s+)?(?:if|for|while)\s*\(.*\))$/.test(
        code
      );
    }
  }
  return false;
}

function markBracelessYieldLine(text, line) {
  const code = text.replace(/\/\/.*$/, '').trimEnd();
  if (!YIELD_PATTERN.test(text) || !code.endsWith(';')) {
    return text;
  }
  const indent = text.length - text.trimStart().length;
  const comment = text.slice(code.length);
  return `${text.slice(0, indent)}{ __simMarkLine(${line}); ${code.slice(indent)} }${comment}`;
}

function markYieldLine(text, line) {
  if (!YIELD_PATTERN.test(text)) {
    return text;
  }
  const indent = text.length - text.trimStart().length;
  return `${text.slice(0, indent)}__simMarkLine(${line}); ${text.slice(indent)}`;
}

function pin(names) {
  return names
    .map(
      (name) =>
        `Object.defineProperty(${name}, 'name', { value: '${name}', configurable: true });` +
        `Object.defineProperty(${name}.prototype, Symbol.for('worklets.snippetFn'), { value: ${name}, configurable: true });`
    )
    .join('\n');
}

function bracketDelta(text) {
  let delta = 0;
  let quote = null;
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
    } else if (char === '{') {
      delta++;
    } else if (char === '}') {
      delta--;
    }
  }
  return delta;
}
