const HASH_TOKEN =
  /(\.worklets\/)(\d+)(\.js)|(__workletHash = )(\d+)|(_worklet_)(\d+)(_init_data)/;

let idByHash = new Map();
let nextId = 1;
let serializing = false;

function resetWorkletHashIds() {
  idByHash = new Map();
  nextId = 1;
}

function idFor(hash) {
  if (!idByHash.has(hash)) {
    idByHash.set(hash, nextId++);
  }
  return idByHash.get(hash);
}

function normalizeSnapshot(code) {
  return code
    .replace(/(\.worklets\/)(\d+)(\.js)/g, (_, a, h, b) => a + idFor(h) + b)
    .replace(/(__workletHash = )(\d+)/g, (_, a, h) => a + idFor(h))
    .replace(/(_worklet_)(\d+)(_init_data)/g, (_, a, h, b) => a + idFor(h) + b);
}

const workletHashSerializer = {
  test: (value) =>
    !serializing && typeof value === 'string' && HASH_TOKEN.test(value),
  serialize: (value, config, indentation, depth, refs, printer) => {
    serializing = true;
    try {
      return printer(
        normalizeSnapshot(value),
        config,
        indentation,
        depth,
        refs
      );
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
