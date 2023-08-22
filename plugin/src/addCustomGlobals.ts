import { globals } from './commonObjects';

// This function allows adding custom globals such as host-functions.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addCustomGlobals = function (this: any) {
  if (this.opts != null && Array.isArray(this.opts.globals)) {
    this.opts.globals.forEach((name: string) => {
      globals.add(name);
    });
  }
};
