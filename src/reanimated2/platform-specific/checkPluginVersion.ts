import { jsVersion } from './jsVersion';

export function checkPluginVersion(): void {
  const pluginVersion = global._REANIMATED_VERSION_PLUGIN;
  if (pluginVersion === undefined) {
    console.error(
      `[Reanimated] Couldn't determine the version of babel plugin of Reanimated. Did you forget to add 'react-native-reanimated/plugin' to your 'babel.config.js' file?`
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
      `[Reanimated] Mismatch between JavaScript part and babel plugin part of Reanimated (${jsVersion} vs. ${pluginVersion}). Did you forget to re-build the app after upgrading react-native-reanimated?`
    );
  }
}
