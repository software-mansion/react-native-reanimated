import {
  describe,
  expect,
  notify,
  test,
  createOrderConstraint,
  createTestValue,
  waitForNotifications,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { dispatchWorklet } from './dispatchWorklet';
import { RuntimeKind } from 'react-native-worklets';

describe('Test setTimeout', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'executes single callback, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const notification = 'callback';
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        setTimeout(() => setFlag('ok', notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'passes parameters, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const notification = 'callback';
      const argValue = 42;
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        setTimeout(
          (value: number) => {
            if (value === argValue) {
              setFlag('ok');
            }
            notify(notification);
          },
          0,
          argValue
        );
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'increments handle on each request, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        const handle1 = setTimeout(() =>
          notify(notification1)
        ) as unknown as number;
        const handle2 = setTimeout(() =>
          notify(notification2)
        ) as unknown as number;

        if (handle1 + 1 === handle2) {
          setFlag('ok');
        }
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'executes after requested delay, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const notification = 'callback';
      const delay = 128;
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        const startTime = performance.now();
        setTimeout(() => {
          const elapsed = performance.now() - startTime;
          if (elapsed >= delay - 1) {
            setFlag();
          } else {
            setFlag(`not_ok: fired after ${elapsed}ms`);
          }
          notify(notification);
        }, delay);
      }, runtimeKind);

      // Assert
      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'nested timeouts, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        setTimeout(() => {
          setTimeout(() => {
            order(2, notification2);
          });
          order(1, notification1);
        });
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'timeouts order of execution, same time, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        setTimeout(() => {
          order(1, notification1);
        });
        setTimeout(() => {
          order(2, notification2);
        });
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'timeouts order of execution, different times, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        setTimeout(() => {
          order(1, notification1);
        }, 50);
        setTimeout(() => {
          order(2, notification2);
        }, 70);
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test(`timeouts order of execution, inverted scheduled order, runtime: **${RuntimeKind.Worker}**`, async () => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = createOrderConstraint();

    // Act
    dispatchWorklet(() => {
      'worklet';
      setTimeout(() => {
        order(2, notification2);
      }, 70);
      setTimeout(() => {
        order(1, notification1);
      }, 50);
    }, RuntimeKind.Worker);

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(confirmedOrder.value).toBe(2);
  });

  test(`timeouts order of execution, inverted scheduled order, runtime: **${RuntimeKind.UI}**`, async () => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = createOrderConstraint();
    const [bothTimeoutsWereDue, markBothTimeoutsWereDue] =
      createTestValue<boolean>(false);
    const shorterDelay = 50;
    const longerDelay = 70;

    // Act
    dispatchWorklet(() => {
      'worklet';
      const scheduledAt = performance.now();
      setTimeout(() => {
        order(2, notification2);
      }, longerDelay);
      setTimeout(() => {
        markBothTimeoutsWereDue(performance.now() - scheduledAt >= longerDelay);
        order(1, notification1);
      }, shorterDelay);
    }, RuntimeKind.UI);

    // Assert
    await waitForNotifications([notification1, notification2]);
    if (bothTimeoutsWereDue.value) {
      expect(confirmedOrder.value === 2 || confirmedOrder.value === -1).toBe(
        true
      );
    } else {
      expect(confirmedOrder.value).toBe(2);
    }
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'timeouts order of execution, nested timeouts, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2, notification3] = [
        'callback1',
        'callback2',
        'callback3',
      ];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        setTimeout(() => {
          setTimeout(() => {
            order(2, notification2);
          }, 20);
          order(1, notification1);
        }, 20);

        setTimeout(() => {
          order(3, notification3);
        }, 100);
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2, notification3]);
      expect(confirmedOrder.value).toBe(3);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'timeouts order of execution, asynchronous scheduling, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        setTimeout(() => {
          order(2, notification2);
        });
        order(1, notification1);
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );
});
