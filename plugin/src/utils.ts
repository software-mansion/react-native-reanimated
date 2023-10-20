import type { ReanimatedPluginPass } from './types';

export function isRelease() {
  const pattern = /(prod|release|stag[ei])/i;
  return !!(
    process.env.BABEL_ENV?.match(pattern) ||
    process.env.NODE_ENV?.match(pattern)
  );
}

// env variable takes precedence over options, to allow users to quickly change
// the behavior of the plugin without modifying the `babel.config.js` file
export function isWeb(state: ReanimatedPluginPass) {
  if (process.env.REANIMATED_BABEL_PLUGIN_IS_WEB === '0') {
    return false;
  }
  return process.env.REANIMATED_BABEL_PLUGIN_IS_WEB === '1' || state.opts.isWeb;
}
