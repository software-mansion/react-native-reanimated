import {
  createShareable,
  createWorkletRuntime,
  runOnRuntimeSync,
  type Shareable,
} from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

const ITERATIONS = 150;
const MAX_COLLECTION_ATTEMPTS = 20;

describe('Shareable whose host Worker Runtime was destroyed', () => {
  test('is a guest on new Worker Runtimes after its host is collected', async () => {
    const orphans: Shareable<{ index: number }>[] = [];
    let completed = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      const orphan = makeOrphanShareable(i);
      orphans.push(orphan.shareable);
      if (!(await waitUntilRuntimeIsDestroyed(orphan.hostId))) {
        throw new Error(
          `${i}: the host Worker Runtime ${orphan.hostId} is still alive`
        );
      }
      const successor = createWorkletRuntime({
        name: `shareable-successor-${i}`,
        enableEventLoop: false,
      });
      const shareables = orphans.slice();
      completed += runOnRuntimeSync(successor, () => {
        'worklet';
        return shareables.every((shareable) => shareable.isHost === false)
          ? 1
          : 0;
      });
      await collectGarbage();
    }
    expect(completed).toBe(ITERATIONS);
  });
});

function makeOrphanShareable(index: number) {
  const host = createWorkletRuntime({
    name: `shareable-host-${index}`,
    enableEventLoop: false,
  });
  const shareable = createShareable(
    host.runtimeId,
    { index },
    { initSynchronously: true }
  );
  return { hostId: host.runtimeId, shareable };
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
