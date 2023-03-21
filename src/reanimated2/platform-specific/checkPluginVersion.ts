import { jsVersion } from './jsVersion';

export function checkPluginVersion(): void {
  const pluginVersion = global._REANIMATED_VERSION_PLUGIN;
  if (pluginVersion === undefined) {
    console.error(
      `[Reanimated] Couldn't determine the version of Reanimated Babel plugin. Did you forget to add 'react-native-reanimated/plugin' to your 'babel.config.js' file?`
    );
    return;
  }
  const ok = (() => {
    if (
      jsVersion.match(/^\d+\.\d+\.\d+$/) &&
      pluginVersion.match(/^\d+\.\d+\.\d+$/)
    ) {
      // x.y.z, compare only major and minor, skip patch
      const [jsMajor, jsMinor] = jsVersion.split('.');
      const [pluginMajor, pluginMinor] = pluginVersion.split('.');
      return jsMajor === pluginMajor && jsMinor === pluginMinor;
    } else {
      // alpha, beta or rc, compare everything
      return jsVersion === pluginVersion;
    }
  })();
  if (!ok) {
    console.error(
      `[Reanimated] Mismatch between JavaScript code version and Reanimated Babel plugin version (${jsVersion} vs. ${pluginVersion}). Please clear your Metro bundler cache with `yarn start --reset-cache`, `npm start -- --reset-cache` or `expo start -c` and run the app again.
    );
  }
}
