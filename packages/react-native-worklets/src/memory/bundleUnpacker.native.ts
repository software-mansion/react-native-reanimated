'use strict';

import { logger } from '../debug/logger';
import type { WorkletFactory, WorkletFunction } from '../types';

export function bundleValueUnpacker(objectToUnpack: ObjectToUnpack): unknown {
  const moduleId = objectToUnpack.__moduleId;
  if (moduleId !== undefined) {
    return getWorklet(moduleId, objectToUnpack.__closure);
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
): WorkletFunction | undefined {
  let worklet;
  if (__DEV__) {
    try {
      worklet = getWorkletFromMetroRequire(moduleId, closureVariables);
    } catch (e) {
      logger.error(
        `Unable to resolve worklet from module ${moduleId}. Try reloading the app. Original error: ${(e as Error).message}`
      );
    }
  } else {
    worklet = getWorkletFromMetroRequire(moduleId, closureVariables);
  }
  return worklet;
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
