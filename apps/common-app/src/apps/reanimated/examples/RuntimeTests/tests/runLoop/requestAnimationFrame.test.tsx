import React from 'react';

import {
  describe,
  expect,
  notify,
  render,
  test,
  useOrderConstraint,
  useTestValue,
  waitForNotifications,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';
import { DispatchTestComponent } from './DispatchTestComponent';
import { RuntimeKind } from 'react-native-worklets';

describe('Test requestAnimationFrame', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])('executes single callback, runtime: **%s**', async runtimeKind => {
    // Arrange
    const notification = 'callback1';
    const [flag, setFlag] = useTestValue('not_ok');

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          requestAnimationFrame(() => setFlag('ok', notification));
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
      const [flag, setFlag] = useTestValue('not_ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const handle1 = requestAnimationFrame(() => notify(notification1));
            const handle2 = requestAnimationFrame(() => notify(notification2));

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
    'executes two callbacks in the same iteration, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = useTestValue('not_ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            let timestamp = 0;
            requestAnimationFrame(frameTimestamp => {
              timestamp = frameTimestamp;
              notify(notification1);
            });
            requestAnimationFrame(frameTimestamp => {
              if (timestamp === frameTimestamp) {
                setFlag('ok');
              }
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
    'executes two callbacks in different iterations, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = useTestValue('not_ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            let timestamp = 0;
            requestAnimationFrame(frameTimestamp => {
              timestamp = frameTimestamp;
              requestAnimationFrame(frameTimestamp => {
                if (frameTimestamp > timestamp) {
                  setFlag('ok');
                }
                notify(notification2);
              });
              notify(notification1);
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

  //TODO
  test.each([RuntimeKind.UI, RuntimeKind.Worker])('nested frames, runtime: **%s**', async runtimeKind => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = useOrderConstraint();

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
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
    'frames order of execution, same time, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = useOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            requestAnimationFrame(() => {
              order(1, notification1);
            });
            requestAnimationFrame(() => {
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
    'frames order of execution, nested frames, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [confirmedOrder, order] = useOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                order(3, notification2);
              });
              order(1, notification1);
            });
            requestAnimationFrame(() => {
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
    'frame order of execution, asynchronous scheduling, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = useOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            requestAnimationFrame(() => {
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
