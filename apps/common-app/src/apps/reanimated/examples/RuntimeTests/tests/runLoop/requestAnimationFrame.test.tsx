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

describe('Test requestAnimationFrame', () => {
  test('executes single callback', async () => {
    // Arrange
    const notification = 'callback1';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          requestAnimationFrame(() => notify(notification));
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
          const handle1 = requestAnimationFrame(() => notify(notification1));
          const handle2 = requestAnimationFrame(() => notify(notification2));

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

  test('executes two callbacks in the same iteration', async () => {
    // Arrange
    const notification1 = 'callback1';
    const notification2 = 'callback2';

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          let timestamp = 0;
          requestAnimationFrame(frameTimestamp => {
            timestamp = frameTimestamp;
            notify(notification1);
          });
          requestAnimationFrame(frameTimestamp => {
            if (timestamp === frameTimestamp) {
              sharedResult.value = 'ok';
            }
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

  test('executes two callbacks in different iterations', async () => {
    // Arrange
    const notification1 = 'callback1';
    const notification2 = 'callback2';

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          let timestamp = 0;
          requestAnimationFrame(frameTimestamp => {
            timestamp = frameTimestamp;
            requestAnimationFrame(frameTimestamp => {
              if (frameTimestamp > timestamp) {
                sharedResult.value = 'ok';
              }
              notify(notification2);
            });
            notify(notification1);
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
});
