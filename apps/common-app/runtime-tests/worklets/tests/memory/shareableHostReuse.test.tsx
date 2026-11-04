import {
  createShareable,
  createWorkletRuntime,
  runOnRuntimeSync,
  type Shareable,
} from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

const ITERATIONS = 150;

describe('Shareable whose host Worker Runtime was destroyed', () => {
  test('is a guest on new Worker Runtimes after its host is collected', async () => {
    const orphans: Shareable<{ index: number }>[] = [];
    let completed = 0;
    for (let i = 0; i < ITERATIONS; i++) {
      orphans.push(makeOrphanShareable(i));
      await collectGarbage();
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
  return createShareable(
    host.runtimeId,
    { index },
    { initSynchronously: true }
  );
}

async function collectGarbage() {
  for (let i = 0; i < 3; i++) {
    globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
