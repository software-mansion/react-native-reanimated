const { Platform } = require('react-native');

/**
 * @typedef {'ios' | 'android' | 'macos' | 'windows' | 'web'} SupportedPlatform
 */

/**
 * @param {SupportedPlatform} targetOS
 * @param {SupportedPlatform[]} priorityKeys
 */
function mockPlatform(targetOS, priorityKeys) {
  Platform.OS = targetOS;

  const originalSelect = Platform.select.bind(Platform);

  /**
   * @param {Record<SupportedPlatform | 'default', unknown>} spec
   */
  function selectFromSpec(spec) {
    for (const key of priorityKeys) {
      if (spec[key] !== undefined) {
        return spec[key];
      }
    }

    if (spec.default !== undefined) {
      return spec.default;
    }

    return originalSelect(spec);
  }

  Platform.select = (spec) => {
    if (spec && typeof spec === 'object') {
      return selectFromSpec(/** @type {Record<SupportedPlatform | 'default', unknown>} */(spec));
    }

    return spec;
  };
}

module.exports = { mockPlatform };
