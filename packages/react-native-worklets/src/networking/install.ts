'use strict';

import { XMLHttpRequest } from './XMLHttpRequest';

/**
 * Installs the networking API on a Worklet Runtime. The native
 * `__workletsNetworking` binding is installed by C++ only on Worklet Runtimes
 * in Bundle Mode, so this function is a no-op anywhere else.
 */
let installed = false;

export function installNetworking() {
  if (globalThis.__workletsNetworking === undefined || installed) {
    return;
  }
  installed = true;

  const global = globalThis as unknown as Record<string, unknown>;
  global.XMLHttpRequest ??= XMLHttpRequest;
}
