import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

import { describe, expect, getRegisteredValue, registerValue, render, test } from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { ProgressBar } from './components';

type UpdateKeyComponentProps = {
  initialValue: number[] | Record<string | number | symbol, unknown>;
  keyToUpdate: string | number | symbol;
  progress: number;
  newVal: unknown;
};

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe('Tests of objects as sharedValue', () => {
  const UpdateKeyOriginalAPI = ({ initialValue, keyToUpdate, newVal }: UpdateKeyComponentProps) => {
    const sharedValue = useSharedValue(initialValue);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);
    useEffect(() => {
      const currentValue = sharedValue.value;
      currentValue[keyToUpdate as any] = newVal;
      sharedValue.value = currentValue;
    });
    return <View />;
  };

  const UpdateKeyReactAPI = ({ initialValue, keyToUpdate, newVal, progress }: UpdateKeyComponentProps) => {
    const sharedValue = useSharedValue(initialValue);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);
    useEffect(() => {
      sharedValue.set(value => {
        value[keyToUpdate as any] = newVal;
        return value;
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
    { initialValue: { [Symbol('a')]: 'a' }, key: Symbol('a'), newVal: 1 },
    { initialValue: { [Symbol('b')]: 'a', [Symbol('b')]: 'a' }, key: Symbol('b'), newVal: 1 },
    { initialValue: { [Symbol('c')]: Symbol('d') }, key: Symbol('c'), newVal: 1 },
    { initialValue: { [Symbol('e')]: Symbol('e') }, key: Symbol('e'), newVal: { a: 44 } },
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
      expect(sharedValue.onUI).toBe(expected, ComparisonMode.OBJECT);
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
      expect(sharedValue.onUI).toBe(expected, ComparisonMode.OBJECT);
      await render(<ProgressBar progress={index / TEST_CASES.length} />);
    },
  );
});
