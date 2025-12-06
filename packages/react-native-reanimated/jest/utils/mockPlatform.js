const { Platform } = require('react-native');

/**
 * @typedef {import('react-native').Platform['OS']} PlatformOS
 *
 * @typedef {Parameters<import('react-native').Platform['select']>[0]} PlatformSelectSpec
 *
 * @typedef {keyof PlatformSelectSpec | 'default'} PlatformSelectKey
 * @param {PlatformOS} targetOS
 * @param {PlatformSelectKey[]} priorityKeys
 */
function mockPlatform(targetOS, priorityKeys) {
  // @ts-ignore - We're mocking Platform.OS for testing purposes
  Platform.OS = targetOS;

  const originalSelect = Platform.select.bind(Platform);

  /**
   * @param {Record<PlatformSelectKey, unknown>} spec
   * @returns {unknown}
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
      return selectFromSpec(
        /** @type {Record<PlatformSelectKey, unknown>} */ (spec)
      );
    }

    return spec;
  };
}

module.exports = { mockPlatform };
