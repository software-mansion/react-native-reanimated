import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';

import { describe, expect, getRegisteredValue, registerValue, render, test } from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { ProgressBar } from './components';

type UpdateKeyComponentProps = {
  initialValue: unknown;
  keyToUpdate: string | number | symbol;
  progress: number;
  newVal: unknown;
};

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe('Tests of objects as sharedValue', () => {
  const UpdateKeyOriginalAPI = ({ initialValue, keyToUpdate, newVal }: UpdateKeyComponentProps) => {
    const sharedValue = useSharedValue(initialValue);
    registerValue(SHARED_VALUE_REF, sharedValue);
    useEffect(() => {
      runOnUISync(() => {
        'worklet';
        const value = { ...(sharedValue.value as Record<string, unknown>) };
        value[keyToUpdate as string] = newVal;
        sharedValue.value = value;
      });
    });
    return <View />;
  };

  const UpdateKeyReactAPI = ({ initialValue, keyToUpdate, newVal, progress }: UpdateKeyComponentProps) => {
    const sharedValue = useSharedValue(initialValue);
    registerValue(SHARED_VALUE_REF, sharedValue);
    useEffect(() => {
      runOnUISync(() => {
        sharedValue.set((value: unknown) => {
          const newValue = { ...(value as Record<string, unknown>) };
          newValue[keyToUpdate as string] = newVal;
          return newValue;
        });
      });
    });
    return <ProgressBar progress={progress} />;
  };

  const TEST_CASES = [
    { initialValue: { 1: 'a' }, key: 1, newVal: 1 },
    { initialValue: [1, 2, 3, 4, 5], key: 1, newVal: -1 },
    { initialValue: [1, 2, 3, 4, 5], key: 0, newVal: -1 },
    { initialValue: [1, 2, 3, 4, 5], key: 0, newVal: { A: [1, 2, 3, { B: 2 }] } },
    { initialValue: [1, 2, 3, 4, 5], key: 0, newVal: [1, 2, 3, 4] },
    { initialValue: { a: undefined, b: [[[[]]]] }, key: 'a', newVal: 1 },
    { initialValue: { a: undefined, b: [[[[]]]] }, key: 'b', newVal: null },
    { initialValue: { a: null, b: { c: null } }, key: 'a', newVal: 1 },
    { initialValue: { a: { b: { c: { d: { e: 1 } } } } }, key: 'a', newVal: 1 },
  ];

  test.each(TEST_CASES)(
    'Change key ${key} of object ${initialValue} to ${newVal}, original API',
    async ({ initialValue, key, newVal }, index) => {
      await render(
        <UpdateKeyOriginalAPI
          initialValue={initialValue}
          keyToUpdate={key}
          newVal={newVal}
          progress={index / TEST_CASES.length}
        />,
      );
      const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
      const expected = { ...initialValue, [key]: newVal };
      expect(sharedValue.onJS).toBe(expected, ComparisonMode.OBJECT);
      await render(<ProgressBar progress={index / TEST_CASES.length} />);
    },
  );

  test.each(TEST_CASES)(
    'Change key ${key} of object ${initialValue} to ${newVal}, React API',
    async ({ initialValue, key, newVal }, index) => {
      await render(
        <UpdateKeyReactAPI
          initialValue={initialValue}
          keyToUpdate={key}
          newVal={newVal}
          progress={index / TEST_CASES.length}
        />,
      );
      const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
      const expected = { ...initialValue, [key]: newVal };
      expect(sharedValue.onJS).toBe(expected, ComparisonMode.OBJECT);
      await render(<ProgressBar progress={index / TEST_CASES.length} />);
    },
  );
});
