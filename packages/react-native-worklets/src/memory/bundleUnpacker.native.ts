'use strict';

import type { WorkletFactory, WorkletFunction } from '../types';

export function bundleValueUnpacker(objectToUnpack: ObjectToUnpack): unknown {
  const moduleId = objectToUnpack.__moduleId;
  if (moduleId !== undefined) {
    return getWorklet(moduleId, objectToUnpack.__closure);
  } else if (objectToUnpack.__workletHash !== undefined) {
    throw new Error(
      '[Worklets] This worklet was compiled without Metro, so it has no module to load on a Worklet Runtime. Make sure Metro transforms the source of the library that defines it.'
    );
  } else {
    throw new Error(
      `[Worklets] Data type not recognized by value unpacker: "${globalThis._toString(
        objectToUnpack
      )}".`
    );
  }
}

function getWorklet(
  moduleId: number | string,
  closureVariables: unknown[] | undefined
): WorkletFunction {
  if (__DEV__) {
    try {
      return getWorkletFromMetroRequire(moduleId, closureVariables);
    } catch (e) {
      return (() => {
        throw new Error(
          `[Worklets] Unable to resolve worklet from module ${moduleId}. Try reloading the app. Original error: ${e instanceof Error ? e.message : String(e)}`
        );
      }) as unknown as WorkletFunction;
    }
  } else {
    return getWorkletFromMetroRequire(moduleId, closureVariables);
  }
}

const metroRequire = globalThis.__r;

function getWorkletFromMetroRequire(
  moduleId: number | string,
  closureVariables: unknown[] | undefined
): WorkletFunction {
  const exportedWorklet = metroRequire(moduleId).default;
  return closureVariables === undefined
    ? (exportedWorklet as WorkletFunction)
    : (exportedWorklet as WorkletFactory)(closureVariables);
}

interface ObjectToUnpack extends WorkletFunction {
  _recur: unknown;
}
