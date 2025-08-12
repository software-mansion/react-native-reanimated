import React from 'react';

import {
  describe,
  expect,
  render,
  test,
  useOrderConstraint,
  useTestValue,
  waitForNotifications,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';
import { TestComponent } from './TestComponent';

describe('Test queueMicrotask', () => {
  test.each(['ui', 'worklet'])('executes single microtask, runtime: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';
    const [flag, setFlag] = useTestValue('not_ok');

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          queueMicrotask(() => setFlag('ok', notification));
        }}
        runtimeType={runtimeType}
      />,
    );

    await waitForNotify(notification);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('nested microtasks, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = useOrderConstraint();

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          queueMicrotask(() => {
            queueMicrotask(() => {
              order(2, notification2);
            });
            order(1, notification1);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(confirmedOrder.value).toBe(2);
  });

  test.each(['ui', 'worklet'])('microtasks order of execution, same time, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = useOrderConstraint();

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          queueMicrotask(() => {
            order(1, notification1);
          });
          queueMicrotask(() => {
            order(2, notification2);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(confirmedOrder.value).toBe(2);
  });

  test.each(['ui', 'worklet'])('microtasks order of execution, nested timeouts, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
    const [confirmedOrder, order] = useOrderConstraint();

    // Act
    await render(
      <TestComponent
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
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2, notification3]);
    expect(confirmedOrder.value).toBe(3);
  });

  test.each(['ui', 'worklet'])(
    'microtasks order of execution, asynchronus scheduling, runtime: **%s**',
    async runtimeType => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = useOrderConstraint();

      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            queueMicrotask(() => {
              order(2, notification2);
            });
            order(1, notification1);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );
});
