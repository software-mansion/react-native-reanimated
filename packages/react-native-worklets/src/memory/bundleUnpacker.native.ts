'use strict';

import { logger } from '../debug/logger';
import type { WorkletFactory, WorkletFunction } from '../types';

const handleCache = new WeakMap<WorkletFunction, unknown>();

export function bundleValueUnpacker(
  objectToUnpack: ObjectToUnpack,
  category?: string,
  remoteFunctionName?: string
): unknown {
  const workletHash = objectToUnpack.__workletHash;
  if (workletHash !== undefined) {
    return getWorklet(workletHash, objectToUnpack.__closure);
  } else if (objectToUnpack.__init !== undefined) {
    let value = handleCache.get(objectToUnpack);
    if (value === undefined) {
      value = objectToUnpack.__init();
      handleCache.set(objectToUnpack, value);
    }
    return value;
  } else if (category === 'RemoteFunction') {
    const remoteFunctionHolder = () => {
      remoteFunctionName = remoteFunctionName
        ? remoteFunctionName
        : 'anonymous';

      throw new Error(`[Worklets] Tried to synchronously call a Remote Function. Called "${remoteFunctionName}" on the ${globalThis.__RUNTIME_NAME} Runtime.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-remote-function for more details.`);
    };
    remoteFunctionHolder.__remoteFunction = objectToUnpack;
    return remoteFunctionHolder;
  } else {
    throw new Error(
      `[Worklets] Data type in category "${category}" not recognized by value unpacker: "${globalThis._toString(
        objectToUnpack
      )}".`
    );
  }
}

function getWorklet(
  workletHash: number,
  closureVariables: Record<string, unknown>
): WorkletFunction | undefined {
  let worklet;
  if (__DEV__) {
    try {
      worklet = getWorkletFromMetroRequire(workletHash, closureVariables);
    } catch (e) {
      logger.error(
        `Unable to resolve worklet with hash ${workletHash}. Try reloading the app. Original error: ${(e as Error).message}`
      );
    }
  } else {
    worklet = getWorkletFromMetroRequire(workletHash, closureVariables);
  }
  return worklet;
}

const metroRequire = globalThis.__r;

function getWorkletFromMetroRequire(
  workletHash: number,
  closureVariables: Record<string, unknown>
): WorkletFunction {
  const factory = metroRequire(workletHash).default as WorkletFactory;
  return factory(closureVariables);
}

interface ObjectToUnpack extends WorkletFunction {
  _recur: unknown;
}
