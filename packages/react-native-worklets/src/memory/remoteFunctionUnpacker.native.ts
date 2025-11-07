'use strict';

import type { RemoteFunctionUnpacker } from '../types';
import type { SerializableRef } from './types';

declare global {
  var evalWithSourceMap:
    | ((js: string, sourceURL: string, sourceMap: string) => () => unknown)
    | undefined;
  var evalWithSourceUrl:
    | ((js: string, sourceURL: string) => () => unknown)
    | undefined;
}

/** Used only in dev bundles. */
export function installRemoteFunctionUnpacker() {
  function remoteFunctionUnpacker(
    remoteFunctionRef: SerializableRef,
    remoteFunctionName: string
  ): unknown {
    // eslint-disable-next-line strict
    'use strict';
    const remoteFunctionGuard = function remoteFunctionGuard() {
      // eslint-disable-next-line reanimated/use-worklets-error
      throw new Error(`[Worklets] Tried to synchronously call a non-worklet function ${remoteFunctionName} on the UI thread.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.`);
    };
    remoteFunctionGuard.__remoteFunctionRef = remoteFunctionRef;
    Object.defineProperty(remoteFunctionGuard, 'name', {
      value: `${remoteFunctionName}_remoteFunctionGuard`,
      writable: false,
      configurable: true,
    });
    return remoteFunctionGuard;
  }

  globalThis.__remoteFunctionUnpacker =
    remoteFunctionUnpacker as RemoteFunctionUnpacker;
}
