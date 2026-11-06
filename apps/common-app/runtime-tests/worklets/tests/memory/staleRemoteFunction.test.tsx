import type { WorkletRuntime } from 'react-native-worklets';
import { createWorkletRuntime, runOnRuntimeSync } from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

const ITERATIONS = 50;
const MAX_COLLECTION_ATTEMPTS = 20;
const REMOTE_FUNCTION_ERROR = 'Tried to synchronously call a Remote Function';

describe('Remote Function hosted on a destroyed Worker Runtime', () => {
  test('stays a Remote Function guard on a successor Worker Runtime', async () => {
    const unexpected: string[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const host = makeRemoteFunctionOnShortLivedRuntime(i);
      const remoteFunctions = [host.remoteFunction];
      if (!(await waitUntilRuntimeIsDestroyed(host.runtimeId))) {
        unexpected.push(
          `${i}: the host Worker Runtime ${host.runtimeId} is still alive`
        );
        continue;
      }

      const successors = [
        createWorkletRuntime({
          name: `stale-remote-function-successor-${i}`,
          enableEventLoop: false,
        }),
      ];
      const successorId = successors[0].runtimeId;
      if (!isRuntimeAlive(successorId)) {
        unexpected.push(
          `${i}: the successor Worker Runtime ${successorId} is not alive`
        );
      }
      const result = callOnSuccessor(successors[0], remoteFunctions[0]);
      if (
        !result.isRemoteFunction ||
        !result.message.includes(REMOTE_FUNCTION_ERROR)
      ) {
        unexpected.push(
          `${i}: ${String(result.isRemoteFunction)} ${result.message}`
        );
      }

      remoteFunctions.length = 0;
      successors.length = 0;
      if (!(await waitUntilRuntimeIsDestroyed(successorId))) {
        unexpected.push(
          `${i}: the successor Worker Runtime ${successorId} is still alive`
        );
      }
    }

    expect(unexpected.join('\n')).toBe('');
  });
});

function makeRemoteFunctionOnShortLivedRuntime(index: number) {
  const runtime = createWorkletRuntime({
    name: `stale-remote-function-host-${index}`,
    enableEventLoop: false,
  });
  const remoteFunction = runOnRuntimeSync(runtime, () => {
    'worklet';
    const hostedFunction = () => 1;
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      return hostedFunction;
    }
    const createSerializableNonWorkletFunction = globalThis
      .__workletsModuleProxy.createSerializableNonWorkletFunction as (
      fun: () => number,
      name: string
    ) => () => number;
    return createSerializableNonWorkletFunction(
      hostedFunction,
      'hostedFunction'
    );
  });
  return { runtimeId: runtime.runtimeId, remoteFunction };
}

function callOnSuccessor(
  successor: WorkletRuntime,
  remoteFunction: () => number
) {
  return runOnRuntimeSync(successor, () => {
    'worklet';
    const isRemoteFunction =
      (remoteFunction as unknown as { __remoteFunction?: boolean })
        .__remoteFunction === true;
    try {
      remoteFunction();
      return { isRemoteFunction, message: 'called' };
    } catch (error) {
      return { isRemoteFunction, message: (error as Error).message };
    }
  });
}

async function waitUntilRuntimeIsDestroyed(runtimeId: number) {
  for (let attempt = 0; attempt < MAX_COLLECTION_ATTEMPTS; attempt++) {
    await collectGarbage();
    if (!isRuntimeAlive(runtimeId)) {
      return true;
    }
  }
  return false;
}

function isRuntimeAlive(runtimeId: number) {
  const isAlive = globalThis.__workletsModuleProxy.isRuntimeAlive as (
    runtimeId: number
  ) => boolean;
  return isAlive(runtimeId);
}

async function collectGarbage() {
  for (let i = 0; i < 3; i++) {
    globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
