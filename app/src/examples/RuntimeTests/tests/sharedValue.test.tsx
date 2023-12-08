/* eslint-disable no-inline-styles/no-inline-styles */
import React from 'react';
import { Text } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  render,
  registerValue,
  getRegisteredValue,
  Presets,
} from '../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { ComparisonMode } from '../ReanimatedRuntimeTestsRunner/types';

const SharedValueComponent = ({ initialValue }: { initialValue: any }) => {
  const sharedValue = useSharedValue(initialValue);
  registerValue('sv', sharedValue);
  return <Text>{sharedValue.value}</Text>;
};

describe('Tests of SharedValue', () => {
  test('SharedValue - test number preset', async () => {
    for (const preset of Presets.numbers) {
      await render(null);
      await render(<SharedValueComponent initialValue={preset} />);
      const sharedValue = await getRegisteredValue('sv');
      expect(sharedValue.onJS).toBe(preset, ComparisonMode.NUMBER);
      expect(sharedValue.onUI).toBe(preset, ComparisonMode.NUMBER);
    }
  });
});
