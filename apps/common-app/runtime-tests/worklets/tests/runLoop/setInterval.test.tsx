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

describe('Test setInterval', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'executes single callback, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2, notification3] = [
        'iter1',
        'iter2',
        'iter3',
      ];
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        let iter = 1;
        const handle = setInterval(() => {
          if (iter == 1) {
            notify(notification1);
          } else if (iter == 2) {
            notify(notification2);
          } else {
            setFlag('ok');
            notify(notification3);
            clearInterval(handle);
          }
          iter++;
        });
      }, runtimeKind);

      await waitForNotifications([notification1, notification2, notification3]);
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
        const handle = setInterval(
          (value) => {
            if (value === argValue) {
              setFlag('ok');
            }
            clearInterval(handle);
            notify(notification);
          },
          1,
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
        const handle1 = setInterval(() => {
          notify(notification1);
          clearInterval(handle1);
        }) as unknown as number;
        const handle2 = setInterval(() => {
          notify(notification2);
          clearInterval(handle2);
        }) as unknown as number;

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
      const [notification1, notification2, notification3] = [
        'iter1',
        'iter2',
        'iter3',
      ];
      const delay = 64;
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        let lastTime = performance.now();
        let totalTime = 0;
        let iter = 1;
        const handle = setInterval(() => {
          const now = performance.now();
          totalTime += now - lastTime;
          lastTime = now;
          if (totalTime >= delay * iter - iter) {
            setFlag('ok');
          } else {
            setFlag(`not_ok: ${totalTime}ms after ${iter} intervals`);
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
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2, notification3]);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'nested intervals, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        const handle1 = setInterval(() => {
          const handle2 = setInterval(() => {
            order(2, notification2);
            clearInterval(handle2);
          });
          order(1, notification1);
          clearInterval(handle1);
        });
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'intervals order of execution, same time, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        const handle1 = setInterval(() => {
          order(1, notification1);
          clearInterval(handle1);
        });
        const handle2 = setInterval(() => {
          order(2, notification2);
          clearInterval(handle2);
        });
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'intervals order of execution, different times, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        const handle1 = setInterval(() => {
          order(1, notification1);
          clearInterval(handle1);
        }, 50);
        const handle2 = setInterval(() => {
          order(2, notification2);
          clearInterval(handle2);
        }, 70);
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test(`intervals order of execution, inverted scheduled order, runtime: **${RuntimeKind.Worker}**`, async () => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = createOrderConstraint();

    // Act
    dispatchWorklet(() => {
      'worklet';
      const handle1 = setInterval(() => {
        order(2, notification2);
        clearInterval(handle1);
      }, 70);
      const handle2 = setInterval(() => {
        order(1, notification1);
        clearInterval(handle2);
      }, 50);
    }, RuntimeKind.Worker);

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(confirmedOrder.value).toBe(2);
  });

  test(`intervals order of execution, inverted scheduled order, runtime: **${RuntimeKind.UI}**`, async () => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = createOrderConstraint();
    const [bothIntervalsWereDue, markBothIntervalsWereDue] =
      createTestValue<boolean>(false);
    const shorterDelay = 50;
    const longerDelay = 70;

    // Act
    dispatchWorklet(() => {
      'worklet';
      const scheduledAt = performance.now();
      const handle1 = setInterval(() => {
        order(2, notification2);
        clearInterval(handle1);
      }, longerDelay);
      const handle2 = setInterval(() => {
        markBothIntervalsWereDue(
          performance.now() - scheduledAt >= longerDelay
        );
        order(1, notification1);
        clearInterval(handle2);
      }, shorterDelay);
    }, RuntimeKind.UI);

    // Assert
    await waitForNotifications([notification1, notification2]);
    if (bothIntervalsWereDue.value) {
      expect(confirmedOrder.value === 2 || confirmedOrder.value === -1).toBe(
        true
      );
    } else {
      expect(confirmedOrder.value).toBe(2);
    }
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'intervals order of execution, nested timeouts, runtime: **%s**',
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
        const handle1 = setInterval(() => {
          const handle2 = setInterval(() => {
            order(2, notification2);
            clearInterval(handle2);
          }, 20);
          order(1, notification1);
          clearInterval(handle1);
        }, 20);

        const handle3 = setInterval(() => {
          order(3, notification3);
          clearInterval(handle3);
        }, 100);
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2, notification3]);
      expect(confirmedOrder.value).toBe(3);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'intervals order of execution, asynchronous scheduling, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        const handle1 = setInterval(() => {
          order(2, notification2);
          clearInterval(handle1);
        });
        order(1, notification1);
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );
});
