const { parseSync, traverse } = require('@babel/core');
const generate = require('@babel/generator').default;

const HASH_TOKEN =
  /(\.worklets\/)(\d+)(\.js)|(__workletHash = )(0x[0-9a-fA-F]+|\d+)|(_worklet_)(\d+)(_init_data)/;

let idByHash = new Map();
let nextId = 1;
let serializing = false;

function resetWorkletHashIds() {
  idByHash = new Map();
  nextId = 1;
}

function idFor(raw) {
  const canonical = raw.startsWith('0x') ? BigInt(raw).toString() : raw;
  if (!idByHash.has(canonical)) {
    idByHash.set(canonical, nextId++);
  }
  return idByHash.get(canonical);
}

function renumber(code) {
  return code
    .replace(/(\.worklets\/)(\d+)(\.js)/g, (_, a, h, b) => a + idFor(h) + b)
    .replace(
      /(__workletHash = )(0x[0-9a-fA-F]+|\d+)/g,
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
