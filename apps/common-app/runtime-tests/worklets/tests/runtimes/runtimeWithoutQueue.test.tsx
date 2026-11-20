import { createWorkletRuntime, runOnRuntimeSync } from 'react-native-worklets';

import { describe, expect, test, wait } from '../../../ReJest/RuntimeTestsApi';

const EVENT_LOOP_METHODS = [
  'setTimeout',
  'setImmediate',
  'setInterval',
  'requestAnimationFrame',
  'queueMicrotask',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'cancelAnimationFrame',
];

describe('runtime without a queue', () => {
  test('does not provide the Event Loop', () => {
    // Arrange
    const runtime = createWorkletRuntime({ name: 'test', queue: null });

    // Act
    const availableMethods = runOnRuntimeSync(runtime, () => {
      'worklet';
      const globals = globalThis as unknown as Record<string, unknown>;
      return EVENT_LOOP_METHODS.filter(
        (method) => globals[method] !== undefined
      );
    });

    // Assert
    expect(availableMethods.length).toBe(0);
  });

  test('does not provide the Event Loop with the deprecated useDefaultQueue option', () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'test',
      useDefaultQueue: false,
    });

    // Act
    const hasSetTimeout = runOnRuntimeSync(runtime, () => {
      'worklet';
      return typeof globalThis.setTimeout === 'function';
    });

    // Assert
    expect(hasSetTimeout).toBe(false);
  });

  test('survives scheduling timers', async () => {
    // Arrange
    const runtime = createWorkletRuntime({ name: 'test', queue: null });

    // Act
    runOnRuntimeSync(runtime, () => {
      'worklet';
      const globals = globalThis as unknown as Record<
        string,
        ((callback: () => void, delay?: number) => unknown) | undefined
      >;
      globals.setTimeout?.(() => {}, 0);
      globals.setInterval?.(() => {}, 10);
      globals.setImmediate?.(() => {});
      globals.requestAnimationFrame?.(() => {});
    });
    await wait(300);
    const result = runOnRuntimeSync(runtime, () => {
      'worklet';
      return 42;
    });

    // Assert
    expect(result).toBe(42);
  });

  test('throws when the queue object is not a native queue', async () => {
    await expect(() => {
      createWorkletRuntime({ name: 'test', queue: {} });
    }).toThrow(
      '[Worklets] The Event Loop cannot be enabled on a runtime without a queue.'
    );
  });

  test('accepts an object that is not a native queue when the Event Loop is disabled', () => {
    // Arrange
    const runtime = createWorkletRuntime({
      name: 'test',
      queue: {},
      enableEventLoop: false,
    });

    // Act
    const result = runOnRuntimeSync(runtime, () => {
      'worklet';
      return 42;
    });

    // Assert
    expect(result).toBe(42);
  });

  if (__DEV__) {
    test('throws when the Event Loop is requested', async () => {
      await expect(() => {
        createWorkletRuntime({
          name: 'test',
          queue: null,
          enableEventLoop: true,
        });
      }).toThrow(
        '[Worklets] The Event Loop cannot be enabled on a runtime without a queue.'
      );
    });
  }
});
