const binding = require('../index.js');

globalThis.__WORKLETS_OXC_EMITTED__ = [];

const nativeTransform = binding.transform;
binding.transform = (...args) => {
  const result = nativeTransform(...args);
  globalThis.__WORKLETS_OXC_EMITTED__.push(...result.files);
  return result;
};
