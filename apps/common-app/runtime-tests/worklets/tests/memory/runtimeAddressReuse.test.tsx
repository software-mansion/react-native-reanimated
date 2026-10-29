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

interface IPackedCarrier {
  __isPackedCarrier: true;
  payload: number;
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

  test('packs and unpacks a non-plain carrier on short-lived Worker Runtimes', async () => {
    registerCustomSerializable({
      name: 'runtime address reuse packed carrier',
      determine: (value: object): value is IPackedCarrier => {
        'worklet';
        return (value as Record<string, unknown>).__isPackedCarrier === true;
      },
      pack: (value: IPackedCarrier) => {
        'worklet';
        return { packedPayload: value.payload + 1 };
      },
      unpack: (value: { packedPayload: number }) => {
        'worklet';
        return {
          __isPackedCarrier: true,
          payload: value.packedPayload + 1,
        } as IPackedCarrier;
      },
    });

    const carrier = Object.create(null) as IPackedCarrier;
    carrier.__isPackedCarrier = true;
    carrier.payload = 40;

    const completed = await runInShortLivedRuntimes(() => {
      'worklet';
      return carrier.payload === 42 ? 1 : 0;
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
