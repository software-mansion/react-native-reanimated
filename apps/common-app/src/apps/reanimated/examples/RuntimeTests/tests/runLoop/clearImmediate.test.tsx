import React from 'react';

import {
  describe,
  expect,
  notify,
  render,
  test,
  createTestValue,
  waitForNotifications,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';
import { DispatchTestComponent } from './DispatchTestComponent';
import { RuntimeKind } from 'react-native-worklets';

describe('Test clearImmediate', () => {
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
            clearImmediate(2137);
            setImmediate(() => notify(notification));
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotification(notification);
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'cancels scheduled callback outside of execution loop, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const notification = 'callback2';
      const [flag, setFlag] = createTestValue('ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const handle = setImmediate(() => {
              setFlag('not_ok');
            }) as unknown as number;
            setImmediate(() => notify(notification));
            clearImmediate(handle);
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'cancels flushed callback within execution loop, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback1'];
      const [flag, setFlag] = createTestValue('ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            let handle = 0;
            setImmediate(() => {
              clearImmediate(handle);
              notify(notification1);
            }) as unknown as number;
            handle = setImmediate(() => {
              setFlag('not_ok');
            }) as unknown as number;
            setImmediate(() => notify(notification2));
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
      const [flag, setFlag] = createTestValue('ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            let handle = 0;
            setImmediate(() => {
              handle = setImmediate(() => {
                setFlag('not_ok');
              }) as unknown as number;
              notify(notification1);
            });
            setImmediate(() => {
              clearImmediate(handle);
              setImmediate(() => notify(notification3));
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
