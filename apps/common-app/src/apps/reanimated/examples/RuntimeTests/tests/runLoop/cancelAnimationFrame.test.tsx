import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

import {
  describe,
  expect,
  getRegisteredValue,
  notify,
  registerValue,
  render,
  test,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';
import { runOnUI } from 'react-native-worklets';

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

describe('Test cancelAnimationFrame', () => {
  test('does nothing on invalid handle', async () => {
    // Arrange
    const notification = 'callback';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          cancelAnimationFrame(2137);
          requestAnimationFrame(() => notify(notification));
        }}
      />,
    );

    // Assert
    await waitForNotify(notification);
  });

  test('cancels scheduled callback outside of execution loop', async () => {
    // Arrange
    const notification = 'callback2';

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          sharedResult.value = 'ok';
          const handle = requestAnimationFrame(() => {
            sharedResult.value = 'not_ok';
          });
          requestAnimationFrame(() => notify(notification));
          cancelAnimationFrame(handle);
        }}
      />,
    );

    // Assert
    await waitForNotify(notification);
    const sharedResult = await getRegisteredValue<Result>(RESULT_SHARED_VALUE_REF);
    expect(sharedResult.onUI).toBe('ok');
  });

  test('cancels flushed callback within execution loop', async () => {
    // Arrange
    const notification1 = 'callback1';
    const notification2 = 'callback3';

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          let handle = 0;
          sharedResult.value = 'ok';
          requestAnimationFrame(() => {
            cancelAnimationFrame(handle);
            notify(notification1);
          });
          handle = requestAnimationFrame(() => {
            sharedResult.value = 'not_ok';
          });
          requestAnimationFrame(() => notify(notification2));
        }}
      />,
    );

    // Assert
    await waitForNotify(notification1);
    await waitForNotify(notification2);
    const sharedResult = await getRegisteredValue<Result>(RESULT_SHARED_VALUE_REF);
    expect(sharedResult.onUI).toBe('ok');
  });

  test('cancels scheduled callback within execution loop', async () => {
    // Arrange
    const notification1 = 'callback1';
    const notification2 = 'callback3';
    const notification3 = 'callback4';

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          let handle = 0;
          sharedResult.value = 'ok';
          requestAnimationFrame(() => {
            handle = requestAnimationFrame(() => {
              sharedResult.value = 'not_ok';
            });
            notify(notification1);
          });
          requestAnimationFrame(() => {
            cancelAnimationFrame(handle);
            requestAnimationFrame(() => notify(notification3));
            notify(notification2);
          });
        }}
      />,
    );

    // Assert
    await waitForNotify(notification1);
    await waitForNotify(notification2);
    await waitForNotify(notification3);
    const sharedResult = await getRegisteredValue<Result>(RESULT_SHARED_VALUE_REF);
    expect(sharedResult.onUI).toBe('ok');
  });
});
