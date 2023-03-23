import { jsVersion } from './jsVersion';
import { matchVersion } from './utils';

export function checkPluginVersion(): void {
  // Do not remove the following line and do not add any other directives here,
  // they all will be deleted (see Reanimated Babel plugin).
  'inject Reanimated Babel plugin version';
  const pluginVersion = global._REANIMATED_VERSION_BABEL_PLUGIN;
  if (pluginVersion === undefined) {
    console.error(
      "[Reanimated] Couldn't determine the version of Reanimated Babel plugin. Did you forget to add 'react-native-reanimated/plugin' to your `babel.config.js` file?"
    );
    return;
  }
  const ok = matchVersion(jsVersion, pluginVersion);
  if (!ok) {
    console.error(
      `[Reanimated] Mismatch between JavaScript code version and Reanimated Babel plugin version (${jsVersion} vs. ${pluginVersion}). Please clear your Metro bundler cache with \`yarn start --reset-cache\`,
      \`npm start -- --reset-cache\` or \`expo start -c\` and run the app again.`
    );
  }
}
