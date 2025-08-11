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
import { TestComponent } from './TestComponent';

describe('Test cancelAnimationFrame', () => {
  test.each(['ui', 'worklet'])('does nothing on invalid handle', async runtimeType => {
    // Arrange
    const notification = 'callback';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          cancelAnimationFrame(2137);
          requestAnimationFrame(() => notify(notification));
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotify(notification);
  });

  test.each(['ui', 'worklet'])('cancels scheduled callback outside of execution loop', async runtimeType => {
    // Arrange
    const notification = 'callback2';
    const [flag, setFlag] = useTestValue('ok');

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const handle = requestAnimationFrame(() => {
            setFlag('not_ok');
          });
          requestAnimationFrame(() => notify(notification));
          cancelAnimationFrame(handle);
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotify(notification);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('cancels flushed callback within execution loop', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback3'];
    const [flag, setFlag] = useTestValue('ok');

    // Act
    await render(
      <TestComponent
        worklet={() => {
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
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('cancels scheduled callback within execution loop', async runtimeType => {
    // Arrange
    const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
    const [flag, setFlag] = useTestValue('ok');

    // Act
    await render(
      <TestComponent
        worklet={() => {
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
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2, notification3]);
    expect(flag.value).toBe('ok');
  });
});
