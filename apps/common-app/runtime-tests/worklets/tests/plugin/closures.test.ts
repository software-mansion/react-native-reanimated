import { runOnRuntimeSync, runOnUISync } from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  test,
} from '../../../ReJest/RuntimeTestsApi';

describe('Worklet closures', () => {
  const [runtime] = getWorkletRuntimesFromPool(1);

  test('preserves capture order, undefined entries and independent instances', () => {
    function make(z: { value: number }, missing: undefined, a: string) {
      return (suffix: string) => {
        'worklet';
        return [z.value, missing, a, suffix];
      };
    }

    const first = make({ value: 7 }, undefined, 'first');
    const second = make({ value: 9 }, undefined, 'second');

    expect(runOnUISync(first, 'UI')).toBe([7, undefined, 'first', 'UI']);
    expect(runOnUISync(second, 'UI')).toBe([9, undefined, 'second', 'UI']);
    expect(runOnUISync(first, 'UI')).toBe([7, undefined, 'first', 'UI']);

    expect(runOnRuntimeSync(runtime, first, 'Worker')).toBe([
      7,
      undefined,
      'first',
      'Worker',
    ]);
    expect(runOnRuntimeSync(runtime, second, 'Worker')).toBe([
      9,
      undefined,
      'second',
      'Worker',
    ]);
    expect(runOnRuntimeSync(runtime, first, 'Worker')).toBe([
      7,
      undefined,
      'first',
      'Worker',
    ]);
  });
});
