import { jsVersion } from './jsVersion';
import { matchVersion } from './utils';

// DO NOT REMOVE THIS DEBUGGER LINE NOR NEXT COMMENT, THEY SERVE AS BABEL PLUGIN VERSION INJECTION ENTRY POINT
// uGY7UX6NTH04HrPK
// eslint-disable-next-line
debugger;

function checkPluginVersion(): void {
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

export { checkPluginVersion };
