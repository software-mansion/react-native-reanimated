import {
  createWorkletRuntime,
  registerCustomSerializable,
  runOnRuntimeSync,
} from 'react-native-worklets';

import { describe, expect, test } from '../../../ReJest/RuntimeTestsApi';

const ITERATIONS = 100;

interface IReuseCarrier {
  __isReuseCarrier: true;
}

describe('Retained values after Worker Runtime address reuse', () => {
  test('creates and collects Worker Runtimes after a custom serializable is registered', async () => {
    registerCustomSerializable({
      name: 'runtime address reuse',
      determine: (value: object): value is IReuseCarrier => {
        'worklet';
        return (value as Record<string, unknown>).__isReuseCarrier === true;
      },
      pack: (value: IReuseCarrier) => {
        'worklet';
        return { flag: value.__isReuseCarrier };
      },
      unpack: (value: { flag: true }) => {
        'worklet';
        return { __isReuseCarrier: value.flag } as IReuseCarrier;
      },
    });

    const completed = await runInShortLivedRuntimes(() => {
      'worklet';
      return 1;
    });

    expect(completed).toBe(ITERATIONS);
  });

  test('runs one retained worklet on short-lived Worker Runtimes', async () => {
    const nested = () => {
      'worklet';
      return 1;
    };
    const config = { values: [1, 2, 3], nested: { value: 'retained' } };
    const work = () => {
      'worklet';
      return nested() + config.values.length - 3;
    };

    const completed = await runInShortLivedRuntimes(work);

    expect(completed).toBe(ITERATIONS);
  });
});

async function runInShortLivedRuntimes(work: () => number) {
  let completed = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    completed += runOnce(work, i);
    globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return completed;
}

function runOnce(work: () => number, index: number) {
  const runtime = createWorkletRuntime({
    name: `address-reuse-${index}`,
    enableEventLoop: false,
  });
  return runOnRuntimeSync(runtime, work);
}
