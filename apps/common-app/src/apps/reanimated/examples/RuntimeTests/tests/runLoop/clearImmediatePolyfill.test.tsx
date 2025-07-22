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
import { s } from 'react-strict-dom/dist/dom/html';

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

describe('Test clearImmediate', () => {
  test('does nothing on invalid handle', async () => {
    // Arrange
    const notification = 'callback';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          clearImmediate(2137);
          setImmediate(() => notify(notification));
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
          const handle = setImmediate(() => {
            sharedResult.value = 'not_ok';
          }) as unknown as number;
          setImmediate(() => notify(notification));
          clearImmediate(handle);
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
          setImmediate(() => {
            clearImmediate(handle);
            notify(notification1);
          }) as unknown as number;
          handle = setImmediate(() => {
            sharedResult.value = 'not_ok';
          }) as unknown as number;
          setImmediate(() => notify(notification2));
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
          setImmediate(() => {
            handle = setImmediate(() => {
              sharedResult.value = 'not_ok';
            }) as unknown as number;
            notify(notification1);
          });
          setImmediate(() => {
            clearImmediate(handle);
            setImmediate(() => notify(notification3));
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
