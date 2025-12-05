const { Platform } = require('react-native');

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

Platform.OS = 'web';

const originalSelect = Platform.select.bind(Platform);

Platform.select = (spec) => {
  if (spec == null) {
    return spec;
  }

  if (typeof spec !== 'object' && typeof spec !== 'function') {
    return spec;
  }

  /** @type {Record<string, unknown>} */
  const typedSpec = spec;

  if ('web' in typedSpec) {
    return typedSpec.web;
  }

  if ('default' in typedSpec) {
    return typedSpec.default;
  }

  return originalSelect(typedSpec);
};
