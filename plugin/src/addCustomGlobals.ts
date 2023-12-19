import { globals } from './globals';
import type { ReanimatedPluginPass } from './types';

/**
 * This function allows to add custom globals such as host-functions.
 * Those globals have to be passed as an argument for the plugin in babel.config.js.
 *
 * For example: `plugins: [['react-native-reanimated/plugin', { globals: ['myHostFunction'] }]]`
 */
export function addCustomGlobals(this: ReanimatedPluginPass) {
  if (this.opts && Array.isArray(this.opts.globals)) {
    this.opts.globals.forEach((name: string) => {
      globals.add(name);
    });
  }
}
