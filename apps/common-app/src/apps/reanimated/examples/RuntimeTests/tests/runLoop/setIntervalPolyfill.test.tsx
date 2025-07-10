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

describe('Test setInterval', () => {
  test('executes single callback', async () => {
    // Arrange
    const notification1 = 'iter1';
    const notification2 = 'iter2';
    const notification3 = 'iter3';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          let iter = 1;
          const handle = setInterval(() => {
            if (iter == 1) {
              console.log('1');
              notify(notification1);
            } else if (iter == 2) {
              console.log('2');
              notify(notification2);
            } else {
              console.log('3');
              notify(notification3);
              clearInterval(handle);
            }
            iter++;
          });
        }}
      />,
    );

    await waitForNotify(notification1);
    await waitForNotify(notification2);
    await waitForNotify(notification3);
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
          const handle = setInterval(
            value => {
              if (value === argValue) {
                sharedResult.value = 'ok';
              }
              clearInterval(handle);
              notify(notification);
            },
            1,
            argValue,
          );
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
          const handle1 = setInterval(() => {
            notify(notification1);
            clearInterval(handle1);
          }) as unknown as number;
          const handle2 = setInterval(() => {
            notify(notification2);
            clearInterval(handle2);
          }) as unknown as number;

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
    const notification1 = 'iter1';
    const notification2 = 'iter2';
    const notification3 = 'iter3';
    const delay = 64;

    // Act
    await render(
      <TestComponent
        worklet={sharedResult => {
          'worklet';
          let lastTime = performance.now();
          let totalTime = 0;
          let iter = 1;
          const handle = setInterval(() => {
            const now = performance.now();
            totalTime += now - lastTime;
            lastTime = now;
            if (totalTime >= delay * iter) {
              sharedResult.value = 'ok';
            } else {
              sharedResult.value = 'not_ok';
            }

            if (iter === 1) {
              notify(notification1);
            } else if (iter === 2) {
              notify(notification2);
            } else {
              notify(notification3);
              clearInterval(handle);
            }
            iter++;
          }, delay);
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
