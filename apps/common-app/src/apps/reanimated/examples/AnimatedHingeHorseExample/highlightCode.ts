export interface CodeToken {
  text: string;
  color: string;
}

export function highlightCode(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let plainTextStart = 0;

  for (const match of code.matchAll(TOKEN_PATTERN)) {
    if (match.index > plainTextStart) {
      tokens.push({
        text: code.slice(plainTextStart, match.index),
        color: PLAIN_TEXT_COLOR,
      });
    }
    tokens.push({ text: match[0], color: colorOf(match) });
    plainTextStart = match.index + match[0].length;
  }

  if (plainTextStart < code.length) {
    tokens.push({ text: code.slice(plainTextStart), color: PLAIN_TEXT_COLOR });
  }
  return tokens;
}

function colorOf(match: RegExpMatchArray): string {
  const tokenKindIndex = match
    .slice(1)
    .findIndex((group) => group !== undefined);
  return TOKEN_KINDS[tokenKindIndex].color;
}

const PLAIN_TEXT_COLOR = 'white';

const TOKEN_KINDS = [
  { kind: 'comment', pattern: /\/\/.*/, color: '#8ccf9a' },
  { kind: 'keyword', pattern: /\b(?:const|return)\b/, color: '#ff9ecf' },
  { kind: 'number', pattern: /\b\d+\b/, color: '#ffb86b' },
  { kind: 'call', pattern: /\b[a-z]\w*(?=\()/, color: '#ffd866' },
  { kind: 'constant', pattern: /\b[A-Z][A-Z_]+\b/, color: '#b9f27c' },
  { kind: 'type', pattern: /\b[A-Z]\w*\b/, color: '#7ee8fa' },
  { kind: 'property', pattern: /\b\w+(?=:)/, color: '#9cc4ff' },
  { kind: 'punctuation', pattern: /[^\w\s]+/, color: '#8fa3d9' },
];

const TOKEN_PATTERN = new RegExp(
  TOKEN_KINDS.map(({ pattern }) => `(${pattern.source})`).join('|'),
  'g'
);
