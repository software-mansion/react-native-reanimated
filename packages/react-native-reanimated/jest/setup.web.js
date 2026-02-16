const { Platform } = require('react-native');

/* global window */
if (window && typeof window.matchMedia !== 'function') {
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
  if (spec && typeof spec === 'object') {
    /** @type {Record<string, unknown>} */
    const typedSpec = spec;
    return typedSpec.web ?? typedSpec.default ?? originalSelect(typedSpec);
  }

  return spec;
};
