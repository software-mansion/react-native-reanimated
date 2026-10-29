import type { WorkletRuntime } from 'react-native-worklets';
import { createWorkletRuntime, runOnRuntimeSync } from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

const ITERATIONS = 100;

describe('Release of values cached for a destroyed Worker Runtime', () => {
  test('garbage collection is available', () => {
    expect(typeof globalThis.gc).toBe('function');
  });

  test('releases retained worklets after their Worker Runtime is destroyed', async () => {
    const kept: (() => number)[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      kept.push(materializeOnShortLivedRuntime(makeRetainedWorklet(i), i));
    }
    await collectGarbage();

    const successors = createSuccessorRuntimes();

    kept.length = 0;
    await collectGarbage();

    expect(runOnSuccessors(successors)).toBe(ITERATIONS);
  });

  test('releases remote functions hosted on a destroyed Worker Runtime', async () => {
    const kept: (() => number)[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      kept.push(makeRemoteFunctionOnShortLivedRuntime(i));
    }
    await collectGarbage();

    const successors = createSuccessorRuntimes();

    kept.length = 0;
    await collectGarbage();

    expect(runOnSuccessors(successors)).toBe(ITERATIONS);
  });
});

function makeRetainedWorklet(index: number) {
  const payload = { index, values: [index, index + 1, index + 2] };
  return () => {
    'worklet';
    return payload.values.length - 2;
  };
}

function materializeOnShortLivedRuntime(work: () => number, index: number) {
  const runtime = createWorkletRuntime({
    name: `destroyed-runtime-cleanup-${index}`,
    enableEventLoop: false,
  });
  runOnRuntimeSync(runtime, work);
  return work;
}

function makeRemoteFunctionOnShortLivedRuntime(index: number) {
  const runtime = createWorkletRuntime({
    name: `destroyed-runtime-remote-${index}`,
    enableEventLoop: false,
  });
  return runOnRuntimeSync(runtime, () => {
    'worklet';
    const values = [index, index + 1, index + 2];
    return () => values.length - 2;
  });
}

async function collectGarbage() {
  for (let i = 0; i < 3; i++) {
    globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function createSuccessorRuntimes() {
  return Array.from({ length: ITERATIONS }, (_, index) =>
    createWorkletRuntime({
      name: `destroyed-runtime-successor-${index}`,
      enableEventLoop: false,
    })
  );
}

function runOnSuccessors(successors: WorkletRuntime[]) {
  let completed = 0;
  for (const runtime of successors) {
    completed += runOnRuntimeSync(runtime, () => {
      'worklet';
      return 1;
    });
  }
  return completed;
}
