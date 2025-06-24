import React, { useEffect } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

import {
  describe,
  expect,
  getRegisteredValue,
  Presets,
  registerValue,
  render,
  test,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { MutableAPI, ProgressBar } from './components';

type MultiplyComponentProps<T> = {
  initialValue: T;
  factor: T;
  progress: number;
};

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe('Test _mathematical operations_ on sharedValue', () => {
  const MultiplySVOriginalAPI = <T extends number | bigint>({
    initialValue,
    factor,
    progress,
  }: MultiplyComponentProps<T>) => {
    const sharedValue = useSharedValue(initialValue);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);
    useEffect(() => {
      const currentValue = sharedValue.value;
      sharedValue.value = (currentValue * factor) as T;
    });
    return <ProgressBar progress={progress} />;
  };

  const MultiplySVReactAPI = <T extends number | bigint>({
    initialValue,
    factor,
    progress,
  }: MultiplyComponentProps<T>) => {
    const sharedValue = useSharedValue(initialValue);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);
    useEffect(() => {
      const currentValue = sharedValue.get();
      sharedValue.set((currentValue * factor) as T);
    });
    return <ProgressBar progress={progress} />;
  };

  const MultiplySVReactAPIWithFunction = <T extends number | bigint>({
    initialValue,
    factor,
    progress,
  }: MultiplyComponentProps<T>) => {
    const sharedValue = useSharedValue(initialValue);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);
    useEffect(() => {
      sharedValue.set(value => (value * factor) as T);
    });
    return <ProgressBar progress={progress} />;
  };

  async function testSharedValueMultiplication<T extends number | bigint>({
    initialValue,
    factor,
    progress,
    mutableAPI,
  }: MultiplyComponentProps<T> & { mutableAPI: MutableAPI }) {
    let ComponentToRender: typeof MultiplySVOriginalAPI;
    switch (mutableAPI) {
      case MutableAPI.ORIGINAL:
        ComponentToRender = MultiplySVOriginalAPI;
        break;
      case MutableAPI.REACT_COMPATIBLE:
        ComponentToRender = MultiplySVReactAPI;
        break;
      case MutableAPI.REACT_COMPATIBLE_WITH_FUNCTION:
        ComponentToRender = MultiplySVReactAPIWithFunction;
        break;
    }
    await render(<ComponentToRender initialValue={initialValue} factor={factor} progress={progress} />);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    const expected = initialValue * factor;
    expect(sharedValue.onJS).toBe(expected, ComparisonMode.NUMBER);
    expect(sharedValue.onUI).toBe(expected, ComparisonMode.NUMBER);
    await render(<ProgressBar progress={progress} />);
  }

  test.each([2, 0.0000045, 123456789])('Test multiplication  *=%p, original API', async (factor: number) => {
    for (const [index, preset] of Presets.numbers.entries()) {
      await testSharedValueMultiplication({
        initialValue: preset,
        factor,
        progress: index / Presets.numbers.length,
        mutableAPI: MutableAPI.ORIGINAL,
      });
    }
  });

  test.each([2, 0.0000045, 123456789])('Test multiplication  *=%p, React API', async (factor: number) => {
    for (const [index, preset] of Presets.numbers.entries()) {
      await testSharedValueMultiplication({
        initialValue: preset,
        factor,
        progress: index / Presets.numbers.length,
        mutableAPI: MutableAPI.REACT_COMPATIBLE,
      });
    }
  });

  test.each([2, 123456789])('Test multiplication  *=%p, React API with function', async (factor: number) => {
    for (const [index, preset] of Presets.numbers.entries()) {
      await testSharedValueMultiplication({
        initialValue: preset,
        factor,
        progress: index / Presets.numbers.length,
        mutableAPI: MutableAPI.REACT_COMPATIBLE_WITH_FUNCTION,
      });
    }
  });

  test.each([BigInt(2), BigInt(-2), BigInt(123456789), BigInt(1234567891234567)])(
    'Test bigInt multiplication  *=%p,  original API',
    async (factor: bigint) => {
      for (const [index, preset] of Presets.bigInts.entries()) {
        await testSharedValueMultiplication({
          initialValue: preset,
          factor,
          progress: index / Presets.numbers.length,
          mutableAPI: MutableAPI.ORIGINAL,
        });
      }
    },
  );

  test.each([BigInt(2), BigInt(-2), BigInt(123456789), BigInt(1234567891234567)])(
    'Test bigInt multiplication  *=%p,  React API',
    async (factor: bigint) => {
      for (const [index, preset] of Presets.bigInts.entries()) {
        await testSharedValueMultiplication({
          initialValue: preset,
          factor,
          progress: index / Presets.numbers.length,
          mutableAPI: MutableAPI.REACT_COMPATIBLE,
        });
      }
    },
  );

  test.each([BigInt(2), BigInt(-2), BigInt(123456789), BigInt(1234567891234567)])(
    'Test bigInt multiplication  *=%p,  React API with function',
    async (factor: bigint) => {
      for (const [index, preset] of Presets.bigInts.entries()) {
        await testSharedValueMultiplication({
          initialValue: preset,
          factor,
          progress: index / Presets.numbers.length,
          mutableAPI: MutableAPI.REACT_COMPATIBLE_WITH_FUNCTION,
        });
      }
    },
  );
});
