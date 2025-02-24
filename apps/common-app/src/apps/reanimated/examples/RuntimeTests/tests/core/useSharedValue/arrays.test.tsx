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

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

type ArrayComponentProps = {
  initialArray: Array<unknown>;
  appendedArray: Array<unknown>;
  progress: number;
};

describe(`_Array operations_ on sharedValue`, () => {
  const AppendToArrayOriginalAPI = ({ initialArray, appendedArray, progress }: ArrayComponentProps) => {
    const sharedValue = useSharedValue(initialArray);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.value = [...sharedValue.value, ...appendedArray];
    });
    return <ProgressBar progress={progress} />;
  };

  const AppendToArrayReactAPI = ({ initialArray, appendedArray, progress }: ArrayComponentProps) => {
    const sharedValue = useSharedValue(initialArray);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.set(value => [...value, ...appendedArray]);
    });
    return <ProgressBar progress={progress} />;
  };

  async function testArrayOperation({
    initialArray,
    appendedArray,
    progress,
    mutableAPI,
  }: ArrayComponentProps & { mutableAPI: MutableAPI }) {
    const ComponentToRender = mutableAPI === MutableAPI.ORIGINAL ? AppendToArrayOriginalAPI : AppendToArrayReactAPI;
    await render(<ComponentToRender initialArray={initialArray} appendedArray={appendedArray} progress={progress} />);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    const expected = [...initialArray, ...appendedArray];
    expect(sharedValue.onJS).toBe(expected, ComparisonMode.ARRAY);
    expect(sharedValue.onUI).toBe(expected, ComparisonMode.ARRAY);
    await render(<ProgressBar progress={progress} />);
  }

  test('Append to an empty array, original API', async () => {
    for (const [index, preset] of Presets.serializableArrays.entries()) {
      await testArrayOperation({
        initialArray: [],
        appendedArray: preset,
        progress: index / Presets.serializableArrays.length,
        mutableAPI: MutableAPI.ORIGINAL,
      });
    }
  });

  test('Append to an empty array, React API', async () => {
    for (const [index, preset] of Presets.serializableArrays.entries()) {
      await testArrayOperation({
        initialArray: [],
        appendedArray: preset,
        progress: index / Presets.serializableArrays.length,
        mutableAPI: MutableAPI.REACT_COMPATIBLE,
      });
    }
  });

  test('Append empty to an array, original API', async () => {
    for (const [index, preset] of Presets.serializableArrays.entries()) {
      await testArrayOperation({
        initialArray: preset,
        appendedArray: [],
        progress: index / Presets.serializableArrays.length,
        mutableAPI: MutableAPI.ORIGINAL,
      });
    }
  });

  test('Append empty to an array, React API', async () => {
    for (const [index, preset] of Presets.serializableArrays.entries()) {
      await testArrayOperation({
        initialArray: preset,
        appendedArray: [],
        progress: index / Presets.serializableArrays.length,
        mutableAPI: MutableAPI.REACT_COMPATIBLE,
      });
    }
  });

  test('Append **[1, "string", [], {A:1}]** to an array, original API', async () => {
    for (const [index, preset] of Presets.serializableArrays.entries()) {
      await testArrayOperation({
        initialArray: preset,
        appendedArray: [1, 'string', [], { A: 1 }],
        progress: index / Presets.serializableArrays.length,
        mutableAPI: MutableAPI.ORIGINAL,
      });
    }
  });

  test('Append **[1, "string", [], {A:1}]** to an array, React API', async () => {
    for (const [index, preset] of Presets.serializableArrays.entries()) {
      await testArrayOperation({
        initialArray: preset,
        appendedArray: [1, 'string', [], { A: 1 }],
        progress: index / Presets.serializableArrays.length,
        mutableAPI: MutableAPI.REACT_COMPATIBLE,
      });
    }
  });

  test('Append an array to **[1, "string", [], {A:1}]** to an array, Original API', async () => {
    for (const [index, preset] of Presets.serializableArrays.entries()) {
      await testArrayOperation({
        initialArray: preset,
        appendedArray: [1, 'string', [], { A: 1 }],
        progress: index / Presets.serializableArrays.length,
        mutableAPI: MutableAPI.ORIGINAL,
      });
    }
  });
  test('Append an array to **[1, "string", [], {A:1}]** to an array, React API', async () => {
    for (const [index, preset] of Presets.serializableArrays.entries()) {
      await testArrayOperation({
        initialArray: preset,
        appendedArray: [1, 'string', [], { A: 1 }],
        progress: index / Presets.serializableArrays.length,
        mutableAPI: MutableAPI.REACT_COMPATIBLE,
      });
    }
  });
});
