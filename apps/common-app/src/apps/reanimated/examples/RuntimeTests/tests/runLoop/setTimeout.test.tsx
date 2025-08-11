import React from 'react';

import {
  describe,
  expect,
  notify,
  orderGuard,
  render,
  test,
  createOrderConstraint,
  createTestValue,
  waitForNotifications,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';
import { DispatchTestComponent } from './DispatchTestComponent';
import { RuntimeKind } from 'react-native-worklets';

describe('Test setTimeout', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])('executes single callback, runtime: **%s**', async runtimeKind => {
    // Arrange
    const notification = 'callback';
    const [flag, setFlag] = createTestValue('not_ok');

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          setTimeout(() => setFlag('ok', notification));
        }}
        runtimeKind={runtimeKind}
      />,
    );

    await waitForNotify(notification);
    expect(flag.value).toBe('ok');
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])('passes parameters, runtime: **%s**', async runtimeKind => {
    // Arrange
    const notification = 'callback';
    const argValue = 42;
    const [flag, setFlag] = createTestValue('not_ok');

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          setTimeout(
            (value: number) => {
              if (value === argValue) {
                setFlag('ok');
              }
              notify(notification);
            },
            0,
            argValue,
          );
        }}
        runtimeKind={runtimeKind}
      />,
    );

    await waitForNotify(notification);
    expect(flag.value).toBe('ok');
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'increments handle on each request, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const handle1 = setTimeout(() => notify(notification1)) as unknown as number;
            const handle2 = setTimeout(() => notify(notification2)) as unknown as number;

            if (handle1 + 1 === handle2) {
              setFlag('ok');
            }
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(flag.value).toBe('ok');
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'executes after requested delay, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const notification = 'callback';
      const delay = 128;
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const startTime = performance.now();
            setTimeout(() => {
              if (performance.now() - startTime >= delay) {
                setFlag();
              }
              notify(notification);
            }, delay);
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotify(notification);
      expect(flag.value).toBe('ok');
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])('nested timeouts, runtime: **%s**', async runtimeKind => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = createOrderConstraint();

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          setTimeout(() => {
            setTimeout(() => {
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
    'timeouts order of execution, same time, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            setTimeout(() => {
              order(1, notification1);
            });
            setTimeout(() => {
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
    'timeouts order of execution, different times, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            setTimeout(() => {
              order(1, notification1);
            }, 50);
            setTimeout(() => {
              order(2, notification2);
            }, 70);
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
    'timeouts order of execution, inverted scheduled order, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            setTimeout(() => {
              order(2, notification2);
            }, 70);
            setTimeout(() => {
              order(1, notification1);
            }, 50);
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
    'timeouts order of execution, nested timeouts, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            setTimeout(() => {
              setTimeout(() => {
                order(2, notification2);
              }, 20);
              order(1, notification1);
            }, 20);
            setFlag(order(1), notification1);
          }, 20);

            setTimeout(() => {
              order(3, notification3);
            }, 100);
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
    'timeouts order of execution, asynchronous scheduling, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            setTimeout(() => {
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
