'use strict';

import { AbortController, AbortSignal } from './AbortController';
import { Blob } from './Blob';
import { FileReader } from './FileReader';
import { FormData } from './FormData';
import { XMLHttpRequest } from './XMLHttpRequest';

/**
 * Installs the networking API (`fetch`, `XMLHttpRequest` and their supporting
 * globals) on a Worklet Runtime. The native `__workletsNetworking` binding is
 * installed by C++ only on Worklet Runtimes in Bundle Mode, so this function is
 * a no-op anywhere else.
 *
 * All polyfills must be in place before `whatwg-fetch` is required because it
 * feature-detects them at module scope.
 */
let installed = false;

export function installNetworking() {
  if (globalThis.__workletsNetworking === undefined || installed) {
    return;
  }
  installed = true;

  const global = globalThis as unknown as Record<string, unknown>;
  global.XMLHttpRequest ??= XMLHttpRequest;
  global.Blob ??= Blob;
  global.FileReader ??= FileReader;
  global.FormData ??= FormData;
  global.AbortController ??= AbortController;
  global.AbortSignal ??= AbortSignal;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('whatwg-fetch');
}
