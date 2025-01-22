import React from 'react';
import { useSharedValue } from 'react-native-reanimated';
import {
  describe,
  test,
  expect,
  render,
  registerValue,
  getRegisteredValue,
  Presets,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { ProgressBar } from './components';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

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
    { presetName: 'arrays', comparisonMode: ComparisonMode.OBJECT },
    { presetName: 'strings', comparisonMode: ComparisonMode.STRING },
    { presetName: 'serializableObjects', comparisonMode: ComparisonMode.OBJECT },
  ] as Array<{ presetName: keyof typeof Presets; comparisonMode: ComparisonMode }>)(
    'Elements of Presets.**${presetName}** can be assigned to shared value',
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

  test.each([...Presets.stringObjects, ...Presets.dates, ...Presets.unserializableObjects])(
    'Object %p causes an error',
    async testedValue => {
      await expect(async () => {
        await render(<SharedValueComponent initialValue={testedValue} progress={0} />);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
        await render(<ProgressBar progress={0} />);
      }).toThrow(
        'ReanimatedError: [Reanimated] Trying to access property `onFrame` of an object which cannot be sent to the UI runtime., js engine: reanimated',
      );
    },
  );

  describe('Test setting _Error types_ as sharedValue', () => {
    test.each([
      new TypeError('Example TypeError'),
      new Error('Example Error'),
      new EvalError('Example EvalError'),
      new RangeError('Example RangeError'),
      new ReferenceError('Example ReferenceError'),
      new SyntaxError('Example SyntaxError'),
      new TypeError('Example TypeError'),
      new URIError('Example URIError'),
    ])('Test %p', async error => {
      await render(<SharedValueComponent initialValue={error} progress={0} />);
      const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);

      const errorObject = { name: error.name, message: error.message };
      expect(sharedValue.onJS).toBe(errorObject, ComparisonMode.OBJECT);
      expect(sharedValue.onUI).toBe(errorObject, ComparisonMode.OBJECT);
    });
  });
});
