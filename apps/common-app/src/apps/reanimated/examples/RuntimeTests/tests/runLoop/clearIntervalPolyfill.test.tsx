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

describe('Test clearInterval', () => {
  test('does nothing on invalid handle', async () => {
    // Arrange
    const notification = 'callback';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          clearInterval(2137);
          const handle = setInterval(() => {
            clearInterval(handle);
            notify(notification);
          });
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
          const testHandle = setInterval(() => {
            sharedResult.value = 'not_ok';
            clearInterval(testHandle);
          }) as unknown as number;
          const handle = setInterval(() => {
            clearInterval(handle);
            notify(notification);
          });
          clearInterval(testHandle);
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
          let testHandle = 0;
          sharedResult.value = 'ok';
          const handle1 = setInterval(() => {
            clearInterval(testHandle);
            clearInterval(handle1);
            notify(notification1);
          }) as unknown as number;
          testHandle = setInterval(() => {
            sharedResult.value = 'not_ok';
            clearInterval(testHandle);
          }) as unknown as number;
          const handle2 = setInterval(() => {
            clearInterval(handle2);
            notify(notification2);
          });
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
          let testHandle = 0;
          sharedResult.value = 'ok';
          const handle1 = setInterval(() => {
            testHandle = setInterval(() => {
              sharedResult.value = 'not_ok';
              clearInterval(testHandle);
            }) as unknown as number;
            clearInterval(handle1);
            notify(notification1);
          });
          const handle2 = setInterval(() => {
            clearInterval(testHandle);
            const handle3 = setInterval(() => {
              clearInterval(handle3);
              notify(notification3);
            });
            clearInterval(handle2);
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
