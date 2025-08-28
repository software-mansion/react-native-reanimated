import React from 'react';

import {
  describe,
  expect,
  render,
  test,
  createOrderConstraint,
  createTestValue,
  waitForNotifications,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';
import { DispatchTestComponent } from './DispatchTestComponent';
import { RuntimeKind } from 'react-native-worklets';

describe('Test queueMicrotask', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])('executes single microtask, runtime: **%s**', async runtimeKind => {
    // Arrange
    const notification = 'callback';
    const [flag, setFlag] = createTestValue('not_ok');

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          queueMicrotask(() => setFlag('ok', notification));
        }}
        runtimeKind={runtimeKind}
      />,
    );

    await waitForNotification(notification);
    expect(flag.value).toBe('ok');
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])('nested microtasks, runtime: **%s**', async runtimeKind => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = createOrderConstraint();

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          queueMicrotask(() => {
            queueMicrotask(() => {
              order(2, notification2);
            });
            order(1, notification1);
          });
        }}
        runtimeKind={runtimeKind}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(confirmedOrder.value).toBe(2);
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'microtasks order of execution, same time, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            queueMicrotask(() => {
              order(1, notification1);
            });
            queueMicrotask(() => {
              order(2, notification2);
            });
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'microtasks order of execution, nested timeouts, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            queueMicrotask(() => {
              queueMicrotask(() => {
                order(3, notification2);
              });
              order(1, notification1);
            });

            queueMicrotask(() => {
              order(2, notification3);
            });
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2, notification3]);
      expect(confirmedOrder.value).toBe(3);
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'microtasks order of execution, asynchronous scheduling, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            queueMicrotask(() => {
              order(2, notification2);
            });
            order(1, notification1);
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );
});
