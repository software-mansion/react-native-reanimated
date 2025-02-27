import React, { useEffect } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  useSharedValue,
  withClamp,
  withDecay,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getRegisteredValue,
  registerValue,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { ProgressBar } from './components';

const SHARED_VALUE_REF = 'SHARED_VALUE_REF';

describe(`Test animation assignments on Shared Value using compiler API`, () => {
  const WithTiming = ({ progress }: { progress: number }) => {
    const sharedValue = useSharedValue(0);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.set(withTiming(100));
    });
    return <ProgressBar progress={progress} />;
  };

  const WithClamp = ({ progress }: { progress: number }) => {
    const sharedValue = useSharedValue(0);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.set(withClamp({ min: 0, max: 100 }, withTiming(200)));
    });
    return <ProgressBar progress={progress} />;
  };

  const WithDecay = ({ progress }: { progress: number }) => {
    const sharedValue = useSharedValue(0);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.set(withDecay({}));
    });
    return <ProgressBar progress={progress} />;
  };

  const WithDelay = ({ progress }: { progress: number }) => {
    const sharedValue = useSharedValue(0);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.set(withDelay(100, withTiming(100)));
    });
    return <ProgressBar progress={progress} />;
  };

  const WithSpring = ({ progress }: { progress: number }) => {
    const sharedValue = useSharedValue(0);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.set(withSpring(100, { duration: 250 }));
    });
    return <ProgressBar progress={progress} />;
  };

  const WithRepeat = ({ progress }: { progress: number }) => {
    const sharedValue = useSharedValue(0);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.set(withRepeat(withTiming(100), 2, true));
    });
    return <ProgressBar progress={progress} />;
  };

  const WithSequence = ({ progress }: { progress: number }) => {
    const sharedValue = useSharedValue(0);
    registerValue(SHARED_VALUE_REF, sharedValue as SharedValue<unknown>);

    useEffect(() => {
      sharedValue.set(withSequence(withTiming(100), withTiming(200)));
    });
    return <ProgressBar progress={progress} />;
  };

  test('WithTiming', async () => {
    await render(<WithTiming progress={0} />);
    await wait(300);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(100, ComparisonMode.NUMBER);
    expect(sharedValue.onUI).toBe(100, ComparisonMode.NUMBER);
  });

  test('WithClamp', async () => {
    await render(<WithClamp progress={0.16} />);
    await wait(300);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(100, ComparisonMode.NUMBER);
    expect(sharedValue.onUI).toBe(100, ComparisonMode.NUMBER);
  });

  test('WithDecay', async () => {
    await render(<WithDecay progress={0.32} />);
    await wait(300);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(0, ComparisonMode.NUMBER);
    expect(sharedValue.onUI).toBe(0, ComparisonMode.NUMBER);
  });

  test('WithDelay', async () => {
    await render(<WithDelay progress={0.48} />);
    await wait(400);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(100, ComparisonMode.NUMBER);
    expect(sharedValue.onUI).toBe(100, ComparisonMode.NUMBER);
  });

  test('WithSpring', async () => {
    await render(<WithSpring progress={0.64} />);
    await wait(300);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(100, ComparisonMode.NUMBER);
    expect(sharedValue.onUI).toBe(100, ComparisonMode.NUMBER);
  });

  test('WithRepeat', async () => {
    await render(<WithRepeat progress={0.8} />);
    await wait(600);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(0, ComparisonMode.NUMBER);
    expect(sharedValue.onUI).toBe(0, ComparisonMode.NUMBER);
  });

  test('WithSequence', async () => {
    await render(<WithSequence progress={0.96} />);
    await wait(600);
    const sharedValue = await getRegisteredValue(SHARED_VALUE_REF);
    expect(sharedValue.onJS).toBe(200, ComparisonMode.NUMBER);
    expect(sharedValue.onUI).toBe(200, ComparisonMode.NUMBER);
  });
});
