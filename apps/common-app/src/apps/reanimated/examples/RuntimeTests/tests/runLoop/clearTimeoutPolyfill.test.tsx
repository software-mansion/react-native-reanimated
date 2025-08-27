import React from 'react';

import {
  describe,
  expect,
  notify,
  render,
  test,
  createTestValue,
  waitForNotifications,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';
import { DispatchTestComponent } from './DispatchTestComponent';
import { RuntimeKind } from 'react-native-worklets';

describe('Test clearTimeout', () => {
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
            clearTimeout(2137);
            setTimeout(() => notify(notification));
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
      const [flag, setFlag] = createTestValue('ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const handle = setTimeout(() => {
              setFlag('not_ok');
            }) as unknown as number;
            setTimeout(() => notify(notification));
            clearTimeout(handle);
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
      const [notification1, notification2] = ['callback1', 'callback3'];
      const [flag, setFlag] = createTestValue('ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            let handle = 0;
            setTimeout(() => {
              clearTimeout(handle);
              notify(notification1);
            }) as unknown as number;
            handle = setTimeout(() => {
              setFlag('not_ok');
            }) as unknown as number;
            setTimeout(() => notify(notification2));
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
            setTimeout(() => {
              handle = setTimeout(() => {
                setFlag('not_ok');
              }) as unknown as number;
              notify(notification1);
            });
            setTimeout(() => {
              clearTimeout(handle);
              setTimeout(() => notify(notification3));
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
