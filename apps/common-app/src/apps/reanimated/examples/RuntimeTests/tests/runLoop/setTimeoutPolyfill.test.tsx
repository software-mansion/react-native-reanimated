import React, { useEffect } from 'react';
import { View } from 'react-native';
import { runOnUI, useSharedValue, SharedValue } from 'react-native-reanimated';

import {
  describe,
  expect,
  getRegisteredValue,
  notify,
  registerValue,
  render,
  test,
  wait,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';

const RESULT_SHARED_VALUE_REF = 'RESULT_SHARED_VALUE_REF';

type Result = 'ok' | 'not_ok' | 'error';

const TestComponent = ({ worklet }: { worklet: (result: SharedValue<Result>) => void }) => {
  const sharedResult = useSharedValue<Result>('not_ok');
  registerValue(RESULT_SHARED_VALUE_REF, sharedResult);
  useEffect(() => {
    runOnUI(() => {
      worklet(sharedResult);
    })();
  });

  return <View />;
};

describe('Test setTimeout', () => {
  test('executes single callback', async () => {
    // Arrange
    const notification = 'callback';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          setTimeout(() => notify(notification));
        }}
      />,
    );

    await waitForNotify(notification);
  });

  test('passes parameters', async () => {
    // Arrange
    const notification = 'callback';
    const argValue = 42;

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          setTimeout(value => {
            if (value === argValue) {
              sharedResult.value = 'ok';
            }
            notify(notification);
          }, argValue);
        }}
      />,
    );

    await waitForNotify(notification);
  });

  test('increments handle on each request', async () => {
    // Arrange
    const notification1 = 'callback1';
    const notification2 = 'callback2';

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          const handle1 = setTimeout(() => notify(notification1)) as unknown as number;
          const handle2 = setTimeout(() => notify(notification2)) as unknown as number;

          if (handle1 + 1 === handle2) {
            sharedResult.value = 'ok';
          }
        }}
      />,
    );

    // Assert
    await waitForNotify(notification1);
    await waitForNotify(notification2);
    const sharedResult = await getRegisteredValue<Result>(RESULT_SHARED_VALUE_REF);
    expect(sharedResult.onUI).toBe('ok');
  });

  test('executes after requested delay', async () => {
    // Arrange
    const notification = 'callback';
    const delay = 128;

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          const startTime = performance.now();
          setTimeout(() => {
            if (performance.now() - startTime >= delay) {
              sharedResult.value = 'ok';
            }
            notify(notification);
          }, delay);
        }}
      />,
    );

    // Assert
    await waitForNotify(notification);
    const sharedResult = await getRegisteredValue<Result>(RESULT_SHARED_VALUE_REF);
    expect(sharedResult.onUI).toBe('ok');
  });
});
