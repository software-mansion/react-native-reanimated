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
  try {
    return getWorkletFromMetroRequire(workletHash, closureVariables);
  } catch (error) {
    throw new Error(
      `[Worklets] Unable to resolve worklet with hash ${workletHash}. If the worklet is defined in a lazily loaded module, load the module with \`import()\` on the RN Runtime first. Try reloading the app. Original error: ${(error as Error)?.message ?? String(error)}`
    );
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
