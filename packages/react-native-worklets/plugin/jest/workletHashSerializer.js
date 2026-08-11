const { parseSync, traverse } = require('@babel/core');
const generate = require('@babel/generator').default;

// oxc's codegen prints whichever numeric form is shortest, so the same hash can
// arrive as `123`, `0x7b` or `123e3`.
const HASH_NUMBER = String.raw`0x[0-9a-fA-F]+|\d+e\+?\d+|\d+`;

const HASH_TOKEN = new RegExp(
  String.raw`(\.worklets\/)(\d+)(\.js)|(__workletHash = )(${HASH_NUMBER})|(_worklet_)(\d+)(_init_data)`
);

let idByHash = new Map();
let nextId = 1;
let serializing = false;

function resetWorkletHashIds() {
  idByHash = new Map();
  nextId = 1;
}

function canonicalize(raw) {
  if (raw.startsWith('0x')) {
    return BigInt(raw).toString();
  }
  if (raw.includes('e') || raw.includes('E')) {
    return BigInt(Number(raw)).toString();
  }
  return raw;
}

function idFor(raw) {
  const canonical = canonicalize(raw);
  if (!idByHash.has(canonical)) {
    idByHash.set(canonical, nextId++);
  }
  return idByHash.get(canonical);
}

function renumber(code) {
  return code
    .replace(/(\.worklets\/)(\d+)(\.js)/g, (_, a, h, b) => a + idFor(h) + b)
    .replace(
      new RegExp(String.raw`(__workletHash = )(${HASH_NUMBER})`, 'g'),
      (_, a, h) => a + idFor(h)
    )
    .replace(/(_worklet_)(\d+)(_init_data)/g, (_, a, h, b) => a + idFor(h) + b);
}

function reprint(code) {
  try {
    const ast = parseSync(code, {
      babelrc: false,
      configFile: false,
      filename: 'snapshot.js',
      sourceType: 'unambiguous',
      plugins: [require.resolve('@babel/plugin-syntax-jsx')],
    });
    traverse(ast, {
      'StringLiteral|NumericLiteral'(path) {
        delete path.node.extra;
      },
    });
    return generate(ast, { compact: false, comments: false }).code;
  } catch {
    return code;
  }
}

function normalizeSnapshot(code) {
  return reprint(renumber(code));
}

const workletHashSerializer = {
  test: (value) =>
    !serializing && typeof value === 'string' && HASH_TOKEN.test(value),
  serialize: (value, config, indentation, depth, refs, printer) => {
    serializing = true;
    try {
      return printer(normalizeSnapshot(value), config, indentation, depth, refs);
    } finally {
      serializing = false;
    }
  },
};

module.exports = {
  workletHashSerializer,
  normalizeSnapshot,
  resetWorkletHashIds,
};
