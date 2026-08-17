import {
  describe,
  expect,
  notify,
  test,
  createTestValue,
  waitForNotifications,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { dispatchWorklet } from './dispatchWorklet';
import { RuntimeKind } from 'react-native-worklets';

describe('Test cancelAnimationFrame', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'does nothing on invalid handle',
    async (runtimeKind) => {
      // Arrange
      const notification = 'callback';

      // Act
      dispatchWorklet(() => {
        'worklet';
        cancelAnimationFrame(2137);
        requestAnimationFrame(() => notify(notification));
      }, runtimeKind);

      // Assert
      await waitForNotification(notification);
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'cancels scheduled callback outside of execution loop',
    async (runtimeKind) => {
      // Arrange
      const notification = 'callback2';
      const [flag, setFlag] = createTestValue('ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        const handle = requestAnimationFrame(() => {
          setFlag('not_ok');
        });
        requestAnimationFrame(() => notify(notification));
        cancelAnimationFrame(handle);
      }, runtimeKind);

      // Assert
      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'cancels flushed callback within execution loop',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback3'];
      const [flag, setFlag] = createTestValue('ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        let handle = 0;
        requestAnimationFrame(() => {
          cancelAnimationFrame(handle);
          notify(notification1);
        });
        handle = requestAnimationFrame(() => {
          setFlag('not_ok');
        });
        requestAnimationFrame(() => notify(notification2));
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'cancels scheduled callback within execution loop',
    async (runtimeKind) => {
      // Arrange
      const [notification1, notification2, notification3] = [
        'callback1',
        'callback2',
        'callback3',
      ];
      const [flag, setFlag] = createTestValue('ok');

      // Act
      dispatchWorklet(() => {
        'worklet';
        let handle = 0;
        requestAnimationFrame(() => {
          handle = requestAnimationFrame(() => {
            setFlag('not_ok');
          });
          notify(notification1);
        });
        requestAnimationFrame(() => {
          cancelAnimationFrame(handle);
          requestAnimationFrame(() => notify(notification3));
          notify(notification2);
        });
      }, runtimeKind);

      // Assert
      await waitForNotifications([notification1, notification2, notification3]);
      expect(flag.value).toBe('ok');
    }
  );
});
