const HASH_TOKEN =
  /(\.worklets\/)(\d+)(\.js)|(__workletHash = )(0x[0-9a-fA-F]+|\d+)|(_worklet_)(\d+)(_init_data)/;

let idByHash = new Map();
let nextId = 1;

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

let serializing = false;

const workletHashSerializer = {
  test: (value) =>
    !serializing && typeof value === 'string' && HASH_TOKEN.test(value),
  serialize: (value, config, indentation, depth, refs, printer) => {
    serializing = true;
    try {
      return printer(renumber(value), config, indentation, depth, refs);
    } finally {
      serializing = false;
    }
  },
};

module.exports = { workletHashSerializer, renumber, resetWorkletHashIds };
