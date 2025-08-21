import React from 'react';

import {
  describe,
  expect,
  notify,
  render,
  test,
  useTestValue,
  waitForNotifications,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';
import { DispatchTestComponent } from './DispatchTestComponent';
import { RuntimeKind } from 'react-native-worklets';

describe('Test clearInterval', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'does nothing on invalid handle, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const notification = 'callback';

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            clearInterval(2137);
            const handle = setInterval(() => {
              clearInterval(handle);
              notify(notification);
            });
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotify(notification);
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'cancels scheduled callback outside of execution loop, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const notification = 'callback2';
      const [flag, setFlag] = useTestValue('ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const testHandle = setInterval(() => {
              setFlag('not_ok');
              clearInterval(testHandle);
            }) as unknown as number;
            const handle = setInterval(() => {
              clearInterval(handle);
              notify(notification);
            });
            clearInterval(testHandle);
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotify(notification);
      expect(flag.value).toBe('ok');
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'cancels flushed callback within execution loop, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = useTestValue('ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            let testHandle = 0;
            const handle1 = setInterval(() => {
              clearInterval(testHandle);
              clearInterval(handle1);
              notify(notification1);
            }) as unknown as number;
            testHandle = setInterval(() => {
              setFlag('not_ok');
              clearInterval(testHandle);
            }) as unknown as number;
            const handle2 = setInterval(() => {
              clearInterval(handle2);
              notify(notification2);
            });
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
    'cancels scheduled callback within execution loop, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [flag, setFlag] = useTestValue('ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            let testHandle = 0;
            const handle1 = setInterval(() => {
              testHandle = setInterval(() => {
                setFlag('not_ok');
                clearInterval(testHandle);
              }) as unknown as number;
              clearInterval(handle1);
              notify(notification1);
            });
            const handle2 = setInterval(() => {
              clearInterval(testHandle);
              const handle3 = setInterval(() => {
                clearInterval(handle3);
                notify(notification3);
              });
              clearInterval(handle2);
              notify(notification2);
            });
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2, notification3]);
      expect(flag.value).toBe('ok');
    },
  );
});
