import { globals } from './globals';
import type { ReanimatedPluginPass } from './types';

// This function allows adding custom globals such as host-functions.

export const addCustomGlobals = function (this: ReanimatedPluginPass) {
  if (this.opts && Array.isArray(this.opts.globals)) {
    this.opts.globals.forEach((name: string) => {
      globals.add(name);
    });
  }
};
