const { mockPlatform } = require('./utils');

/* global window */
if (window && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => { },
    removeEventListener: () => { },
    addListener: () => { },
    removeListener: () => { },
    dispatchEvent: () => false,
  });
}

mockPlatform('web', ['web']);
