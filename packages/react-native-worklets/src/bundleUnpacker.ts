/* eslint-disable reanimated/use-worklets-error */
'use strict';
import type { WorkletFactory, WorkletFunction } from './workletTypes';

export function bundleValueUnpacker(
  objectToUnpack: ObjectToUnpack,
  category?: string,
  remoteFunctionName?: string
): unknown {
  'use strict';
  try {
    let workletsCache = global.__workletsCache;
    let handleCache = global.__handleCache;
    if (workletsCache === undefined) {
      workletsCache = global.__workletsCache = new Map();
      handleCache = global.__handleCache = new WeakMap();
    }
    const workletHash = objectToUnpack.__workletHash;
    if (workletHash !== undefined) {
      try {
        const factory = globalThis.__r(workletHash).default as WorkletFactory;
        const worklet = factory(objectToUnpack.__closure as never);
        return worklet;
      } catch (e) {
        globalThis._log('Error in __getWorklet');
        globalThis._log(e);
        return undefined;
      }
    } else if (objectToUnpack.__init !== undefined) {
      let value = handleCache.get(objectToUnpack);
      if (value === undefined) {
        value = objectToUnpack.__init();
        handleCache.set(objectToUnpack, value);
      }
      return value;
    } else if (category === 'RemoteFunction') {
      const remoteFunctionHolder = () => {
        const label = remoteFunctionName
          ? `function \`${remoteFunctionName}\``
          : 'anonymous function';
        throw new Error(`[Worklets] Tried to synchronously call a non-worklet ${label} on the UI thread.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.`);
      };
      remoteFunctionHolder.__remoteFunction = objectToUnpack;
      return remoteFunctionHolder;
    } else {
      throw new Error(
        `[Worklets] Data type in category "${category}" not recognized by value unpacker: "${_toString(
          objectToUnpack
        )}".`
      );
    }
  } catch (e) {
    globalThis._log('Error in valueUnpacker');
    globalThis._log(e);
    return undefined;
  }
}

interface ObjectToUnpack extends WorkletFunction {
  _recur: unknown;
}
