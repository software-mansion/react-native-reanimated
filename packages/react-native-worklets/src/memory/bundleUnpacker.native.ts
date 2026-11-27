'use strict';

import type { WorkletFactory, WorkletFunction } from '../types';

export function bundleValueUnpacker(objectToUnpack: ObjectToUnpack): unknown {
  const workletHash = objectToUnpack.__workletHash;
  if (workletHash !== undefined) {
    return getWorklet(workletHash, objectToUnpack.__closure);
  } else {
    throw new Error(
      `[Worklets] Data type not recognized by value unpacker: "${globalThis._toString(
        objectToUnpack
      )}".`
    );
  }
}

function getWorklet(
  workletHash: number,
  closureVariables: unknown[] | undefined
): WorkletFunction {
  if (__DEV__) {
    try {
      return getWorkletFromMetroRequire(workletHash, closureVariables);
    } catch (e) {
      return (() => {
        throw new Error(
          `[Worklets] Unable to resolve worklet with hash ${workletHash}. Try reloading the app. Original error: ${describeThrownValue(e)}`
        );
      }) as unknown as WorkletFunction;
    }
  } else {
    return getWorkletFromMetroRequire(workletHash, closureVariables);
  }
}

function describeThrownValue(value: unknown): string {
  try {
    return String(value instanceof Error ? value.message : value);
  } catch {
    return 'a value that cannot be converted to a string';
  }
}

const metroRequire = globalThis.__r;

function getWorkletFromMetroRequire(
  workletHash: number,
  closureVariables: unknown[] | undefined
): WorkletFunction {
  const exportedWorklet = metroRequire(workletHash).default;
  return closureVariables === undefined
    ? (exportedWorklet as WorkletFunction)
    : (exportedWorklet as WorkletFactory)(closureVariables);
}

interface ObjectToUnpack extends WorkletFunction {
  _recur: unknown;
}
