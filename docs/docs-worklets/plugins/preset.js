const presetTRexUI = require('@swmansion/t-rex-ui/preset');

module.exports = function workletsPreset(context, options) {
  const preset = presetTRexUI(context, options);
  return {
    ...preset,
    // Keep the theme (including Copy page), replacing its filename-based
    // exporter with one that understands doc routes and simulation snippets.
    plugins: [require.resolve('./markdown')],
  };
};
