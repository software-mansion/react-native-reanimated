export const code = `function __registerWorkletInitData(hash, initData) {
  globalThis.__initDataRegistry.set(hash, initData);
}

function __registerWorkletFactory(hash, factory) {
  globalThis.__workletFactoryRegistry.set(hash, factory);
}

function __getWorklet(hash, initData, ...closureVariables) {
  const factory = globalThis.__workletFactoryRegistry.get(hash);
  if (!factory) {
    throw new Error(\`Worklet with hash $\{hash} is not registered.\`);
  }
  return factory(initData, ...closureVariables);
}

function initializeWorkletRegistries() {
  if (!globalThis.__initDataRegistry) {
    globalThis.__initDataRegistry = new Map();
    globalThis.__workletFactoryRegistry = new Map();
    globalThis.__registerWorkletInitData = __registerWorkletInitData;
    globalThis.__registerWorkletFactory = __registerWorkletFactory;
    globalThis.__getWorklet = __getWorklet;
  }
}

initializeWorkletRegistries();`;
