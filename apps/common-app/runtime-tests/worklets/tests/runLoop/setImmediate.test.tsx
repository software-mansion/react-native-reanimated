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

describe('Test setImmediate', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'executes single callback, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const notification = 'callback';
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        setImmediate(() => setFlag('ok', notification));
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
        setImmediate((value) => {
          if (value === argValue) {
            setFlag('ok');
          }
          notify(notification);
        }, argValue);
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
        const handle1 = setImmediate(() =>
          notify(notification1)
        ) as unknown as number;
        const handle2 = setImmediate(() =>
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
    'nested tasks, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        setImmediate(() => {
          setImmediate(() => {
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
    'tasks order of execution, same time, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        setImmediate(() => {
          order(1, notification1);
        });
        setImmediate(() => {
          order(2, notification2);
        });
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'tasks order of execution, nested timeouts, runtime: **%s**',
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
        setImmediate(() => {
          setImmediate(() => {
            order(3, notification2);
          });
          order(1, notification1);
        });
        setImmediate(() => {
          order(2, notification3);
        });
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2, notification3]);
      expect(confirmedOrder.value).toBe(3);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'tasks order of execution, asynchronous scheduling, runtime: **%s**',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      dispatchWorklet(() => {
        'worklet';
        setImmediate(() => {
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
