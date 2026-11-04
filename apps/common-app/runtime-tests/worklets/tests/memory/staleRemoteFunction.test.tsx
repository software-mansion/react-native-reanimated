import type { WorkletRuntime } from 'react-native-worklets';
import { createWorkletRuntime, runOnRuntimeSync } from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

const ITERATIONS = 50;
const MAX_COLLECTION_ATTEMPTS = 20;
const REMOTE_FUNCTION_ERROR = 'Tried to synchronously call a Remote Function';

describe('Remote Function hosted on a destroyed Worker Runtime', () => {
  test('stays a Remote Function guard on a successor Worker Runtime', async () => {
    const unexpected: string[] = [];
    await collectGarbage();
    const baseline = getAliveRuntimeCount();
    for (let i = 0; i < ITERATIONS; i++) {
      const remoteFunctions = [makeRemoteFunctionOnShortLivedRuntime(i)];
      if (!(await waitUntilAliveRuntimeCountIs(baseline))) {
        unexpected.push(
          `${i}: the host Worker Runtime is still alive, ${getAliveRuntimeCount()} alive runtimes instead of ${baseline}`
        );
        continue;
      }

      const successors = [
        createWorkletRuntime({
          name: `stale-remote-function-successor-${i}`,
          enableEventLoop: false,
        }),
      ];
      if (getAliveRuntimeCount() !== baseline + 1) {
        unexpected.push(
          `${i}: ${getAliveRuntimeCount()} alive runtimes with the successor instead of ${baseline + 1}`
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
      if (!(await waitUntilAliveRuntimeCountIs(baseline))) {
        unexpected.push(
          `${i}: the successor Worker Runtime is still alive, ${getAliveRuntimeCount()} alive runtimes instead of ${baseline}`
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
  return runOnRuntimeSync(runtime, () => {
    'worklet';
    const hostedFunction = () => 1;
    return hostedFunction;
  });
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

function getAliveRuntimeCount() {
  const getCount = globalThis.__workletsModuleProxy
    .getAliveRuntimeCount as () => number;
  return getCount();
}

async function waitUntilAliveRuntimeCountIs(expected: number) {
  for (let attempt = 0; attempt < MAX_COLLECTION_ATTEMPTS; attempt++) {
    await collectGarbage();
    if (getAliveRuntimeCount() === expected) {
      return true;
    }
  }
  return false;
}

async function collectGarbage() {
  for (let i = 0; i < 3; i++) {
    globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
