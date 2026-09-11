import type { WorkletFunction } from 'react-native-worklets';
import {
  isBundleModeEnabled,
  runOnRuntimeSync,
  runOnUISync,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

describe('Closure-free worklets', () => {
  const [runtime] = getWorkletRuntimesFromPool(1);

  test('deserializes without invoking the worklet and preserves recursion', () => {
    function factorial(n: number): number {
      'worklet';
      if (n === undefined) {
        throw new Error('Invoked during deserialization');
      }
      return n <= 1 ? 1 : n * factorial(n - 1);
    }

    const worklet = factorial as WorkletFunction<[number], number>;
    const inspect = (fn: WorkletFunction<[number], number>) => {
      'worklet';
      return [typeof fn, '__closure' in fn];
    };

    expect('__closure' in worklet).toBe(false);
    expect(runOnUISync(inspect, worklet)).toBe(['function', false]);
    expect(runOnRuntimeSync(runtime, inspect, worklet)).toBe([
      'function',
      false,
    ]);
    expect(runOnUISync(worklet, 5)).toBe(120);
    expect(runOnRuntimeSync(runtime, worklet, 6)).toBe(720);
  });

  if (isBundleModeEnabled()) {
    test('serializes nested worklets from UI to a Worker Runtime', () => {
      function outer(value: string) {
        'worklet';
        const captured = () => {
          'worklet';
          return value;
        };
        const empty = () => {
          'worklet';
          return 42;
        };
        return [captured, empty] as const;
      }

      const result = runOnUISync(() => {
        'worklet';
        const [captured, empty] = outer('nested');
        return [
          '__closure' in outer,
          '__closure' in captured,
          '__closure' in empty,
          runOnRuntimeSync(runtime, captured),
          runOnRuntimeSync(runtime, empty),
        ];
      });

      expect(result).toBe([false, true, false, 'nested', 42]);
    });
  }
});
