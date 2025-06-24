'use strict';
import { WorkletsError } from './WorkletsError';
import type { WorkletFactory, WorkletFunction } from './workletTypes';

const handleCache = new WeakMap<WorkletFunction, unknown>();

export function bundleValueUnpacker(
  objectToUnpack: ObjectToUnpack,
  category?: string,
  remoteFunctionName?: string
): unknown {
  const workletHash = objectToUnpack.__workletHash;
  if (workletHash !== undefined) {
    if (__DEV__) {
      try {
        const factory = globalThis.__r(workletHash).default as WorkletFactory;
        const worklet = factory(objectToUnpack.__closure as never);
        return worklet;
      } catch (error) {
        console.error(
          'Unable to resolve worklet with hash',
          workletHash,
          'try to reload the app.'
        );
        return undefined;
      }
    } else {
      const factory = globalThis.__r(workletHash).default as WorkletFactory;
      const worklet = factory(objectToUnpack.__closure as never);
      return worklet;
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
      throw new WorkletsError(`Tried to synchronously call a non-worklet ${label} on the UI thread.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details.`);
    };
    remoteFunctionHolder.__remoteFunction = objectToUnpack;
    return remoteFunctionHolder;
  } else {
    throw new WorkletsError(
      `Data type in category "${category}" not recognized by value unpacker: "${globalThis._toString(
        objectToUnpack
      )}".`
    );
  }
}

interface ObjectToUnpack extends WorkletFunction {
  _recur: unknown;
}
