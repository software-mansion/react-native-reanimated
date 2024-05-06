/* eslint-disable no-inline-styles/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  render,
  registerValue,
  getRegisteredValue,
  Presets,
  clearRenderOutput,
  wait,
} from '../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';
import { ComparisonMode } from '../../ReanimatedRuntimeTestsRunner/types';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';
const DOUBLED_SHARED_VALUE_REF = 'SHARED_VALUE_REF';

const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <View style={{ margin: 30, borderWidth: 3, borderColor: 'darkorange' }}>
      <View
        style={{
          height: 80,
          width: `${100 * progress}%`,
          backgroundColor: 'darkorange',
        }}
      />
    </View>
  );
};

describe('Tests of sharedValue', () => {
  describe('Test setting different values as sharedValue', () => {
    const SharedValueComponent = ({ initialValue, progress }: { initialValue: unknown; progress: number }) => {
      const sharedValue = useSharedValue(initialValue);
      registerValue(SHARED_VALUE_REF, sharedValue);
      return <ProgressBar progress={progress} />;
    };
    test.each([
      { presetName: 'numbers', comparisonMode: ComparisonMode.NUMBER },
      { presetName: 'bigInts', comparisonMode: ComparisonMode.NUMBER },
      { presetName: 'serializableArrays', comparisonMode: ComparisonMode.ARRAY },
      { presetName: 'strings', comparisonMode: ComparisonMode.STRING },
      { presetName: 'serializableObjects', comparisonMode: ComparisonMode.OBJECT },
    ] as Array<{ presetName: keyof typeof Presets; comparisonMode: ComparisonMode }>)(
      'Test Presets.${presetName}',
      async ({ presetName, comparisonMode }: { presetName: keyof typeof Presets; comparisonMode: ComparisonMode }) => {
        for (const [index, preset] of Presets[presetName].entries()) {
          await render(<SharedValueComponent initialValue={preset} progress={index / Presets[presetName].length} />);
          const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);

          expect(sharedValue.onJS).toBe(preset, comparisonMode);
          expect(sharedValue.onUI).toBe(preset, comparisonMode);
          /*
        This test checks the value of sharedValue after the component mounts. Therefore, we need to clear the render output
        to ensure that a new component will be fully mounted, not just rerendered.
        */
          await render(<ProgressBar progress={index / Presets[presetName].length} />);
        }
      },
    );
  });

  describe('Test mathematical operations on sharedValue', () => {
    const MultiplySharedValueComponent = <T extends number | bigint>({
      initialValue,
      factor,
      progress,
    }: {
      initialValue: T;
      factor: T;
      progress: number;
    }) => {
      const sharedValue = useSharedValue(initialValue);
      registerValue(DOUBLED_SHARED_VALUE_REF, sharedValue);

      useEffect(() => {
        const currentValue = sharedValue.value;
        sharedValue.value = (currentValue * factor) as T;
      });
      return <ProgressBar progress={progress} />;
    };

    test.each([2, 0.0000045, 123456789])('Test multiplication  *=%p', async (factor: number) => {
      for (const [index, preset] of Presets.numbers.entries()) {
        await render(
          <MultiplySharedValueComponent
            initialValue={preset}
            factor={factor}
            progress={index / Presets.numbers.length}
          />,
        );
        const sharedValue = await getRegisteredValue(DOUBLED_SHARED_VALUE_REF);
        const expected = preset * factor;
        expect(sharedValue.onJS).toBe(expected, ComparisonMode.NUMBER);
        expect(sharedValue.onUI).toBe(expected, ComparisonMode.NUMBER);
        await render(<ProgressBar progress={index / Presets.numbers.length} />);
      }
    });
    test.each([BigInt(2), BigInt(-2), BigInt(123456789), BigInt(123456789123456789123456789)])(
      'Test bigInt multiplication  *=%p',
      async (factor: bigint) => {
        for (const [index, preset] of Presets.bigInts.entries()) {
          await render(
            <MultiplySharedValueComponent
              initialValue={preset}
              factor={factor}
              progress={index / Presets.bigInts.length}
            />,
          );
          const sharedValue = await getRegisteredValue(DOUBLED_SHARED_VALUE_REF);
          const expected = preset * factor;
          expect(sharedValue.onJS).toBe(expected, ComparisonMode.NUMBER);
          expect(sharedValue.onUI).toBe(expected, ComparisonMode.NUMBER);
          await render(<ProgressBar progress={index / Presets.bigInts.length} />);
        }
      },
    );
  });

  describe('Tests of arrays as sharedValue', () => {
    const AppendToArrayComponent = ({
      initialValue,
      append,
      progress,
    }: {
      initialValue: Array<unknown>;
      append: Array<unknown>;
      progress: number;
    }) => {
      const sharedValue = useSharedValue(initialValue);
      registerValue(DOUBLED_SHARED_VALUE_REF, sharedValue);

      useEffect(() => {
        sharedValue.value = [...sharedValue.value, ...append];
      });
      return <ProgressBar progress={progress} />;
    };

    test('Append to an empty array', async () => {
      for (const [index, preset] of Presets.serializableArrays.entries()) {
        await render(
          <AppendToArrayComponent
            initialValue={[]}
            append={preset}
            progress={index / Presets.serializableArrays.length}
          />,
        );
        const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
        expect(sharedValue.onJS).toBe(preset, ComparisonMode.ARRAY);
        expect(sharedValue.onUI).toBe(preset, ComparisonMode.ARRAY);
        await render(<ProgressBar progress={index / Presets.serializableArrays.length} />);
      }
    });

    test('Append empty to an array', async () => {
      for (const [index, preset] of Presets.serializableArrays.entries()) {
        await render(
          <AppendToArrayComponent
            initialValue={preset}
            append={[]}
            progress={index / Presets.serializableArrays.length}
          />,
        );
        const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
        expect(sharedValue.onJS).toBe(preset, ComparisonMode.ARRAY);
        expect(sharedValue.onUI).toBe(preset, ComparisonMode.ARRAY);
        await render(<ProgressBar progress={index / Presets.serializableArrays.length} />);
      }
    });

    test('Append [1, "string", [], {A:1}] to an array', async () => {
      for (const [index, preset] of Presets.serializableArrays.entries()) {
        await render(
          <AppendToArrayComponent
            initialValue={preset}
            append={[1, 'string', [], { A: 1 }]}
            progress={index / Presets.serializableArrays.length}
          />,
        );
        const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
        await wait(100); // We have to wait 100ms because of our 1000 element array, operations on it are very slow
        expect(sharedValue.onJS).toBe([...preset, 1, 'string', [], { A: 1 }], ComparisonMode.ARRAY);
        expect(sharedValue.onUI).toBe([...preset, 1, 'string', [], { A: 1 }], ComparisonMode.ARRAY);
        await render(<ProgressBar progress={index / Presets.serializableArrays.length} />);
      }
    });

    test('Append an array to [1, "string", [], {A:1}]', async () => {
      for (const [index, preset] of Presets.serializableArrays.entries()) {
        await render(
          <AppendToArrayComponent
            initialValue={[1, 'string', [], { A: 1 }]}
            append={preset}
            progress={index / Presets.serializableArrays.length}
          />,
        );
        const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
        expect(sharedValue.onJS).toBe([1, 'string', [], { A: 1 }, ...preset], ComparisonMode.ARRAY);
        expect(sharedValue.onUI).toBe([1, 'string', [], { A: 1 }, ...preset], ComparisonMode.ARRAY);
        await render(<ProgressBar progress={index / Presets.serializableArrays.length} />);
      }
    });
  });

  describe('Tests of objects as sharedValue', () => {
    const UpdateKeyComponent = ({
      initialValue,
      keyToUpdate,
      newVal,
    }: {
      initialValue: number[] | Record<string | number | symbol, unknown>;
      keyToUpdate: string | number | symbol;
      newVal: unknown;
    }) => {
      const sharedValue = useSharedValue(initialValue);
      registerValue(DOUBLED_SHARED_VALUE_REF, sharedValue);
      useEffect(() => {
        const currentValue = sharedValue.value;
        currentValue[keyToUpdate as any] = newVal;
        sharedValue.value = currentValue;
      });
      return <View />;
    };

    test.each([
      { someObject: { 1: 'a' }, key: 1, newVal: 1 },
      { someObject: [1, 2, 3, 4, 5], key: 1, newVal: -1 },
      { someObject: [1, 2, 3, 4, 5], key: 0, newVal: -1 },
      { someObject: [1, 2, 3, 4, 5], key: 0, newVal: { A: [1, 2, 3, { B: 2 }] } },
      { someObject: [1, 2, 3, 4, 5], key: 0, newVal: [1, 2, 3, 4] },
      { someObject: { [Symbol('a')]: 'a' }, key: Symbol('a'), newVal: 1 },
      { someObject: { [Symbol('b')]: 'a', [Symbol('b')]: 'a' }, key: Symbol('b'), newVal: 1 },
      { someObject: { [Symbol('c')]: Symbol('d') }, key: Symbol('c'), newVal: 1 },
      { someObject: { [Symbol('e')]: Symbol('e') }, key: Symbol('e'), newVal: { a: 44 } },
      { someObject: { a: undefined, b: [[[[]]]] }, key: 'a', newVal: 1 },
      { someObject: { a: undefined, b: [[[[]]]] }, key: 'b', newVal: null },
      { someObject: { a: null, b: { c: null } }, key: 'a', newVal: 1 },
      { someObject: { a: { b: { c: { d: { e: 1 } } } } }, key: 'a', newVal: 1 },
    ])('Change key ${key} of object ${someObject} to ${newVal}', async ({ someObject, key, newVal }) => {
      await render(<UpdateKeyComponent initialValue={someObject} keyToUpdate={key} newVal={newVal} />);
      const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
      expect(sharedValue.onJS).toBe({ ...someObject, [key]: newVal }, ComparisonMode.OBJECT);
      expect(sharedValue.onUI).toBe({ ...someObject, [key]: newVal }, ComparisonMode.OBJECT);
      await clearRenderOutput();
    });
  });
});
