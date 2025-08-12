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
import { TestComponent } from './TestComponent';

describe('Test setTimeout', () => {
  test.each(['ui', 'worklet'])('executes single callback, runtime: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';
    const [flag, setFlag] = useTestValue('not_ok');

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          setTimeout(() => setFlag('ok', notification));
        }}
        runtimeType={runtimeType}
      />,
    );

    await waitForNotify(notification);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('passes parameters, runtime: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';
    const argValue = 42;
    const [flag, setFlag] = useTestValue('not_ok');

    // Act
    await render(
      <TestComponent
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
        runtimeType={runtimeType}
      />,
    );

    await waitForNotify(notification);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('increments handle on each request, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestValue('not_ok');

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const handle1 = setTimeout(() => notify(notification1)) as unknown as number;
          const handle2 = setTimeout(() => notify(notification2)) as unknown as number;

          if (handle1 + 1 === handle2) {
            setFlag('ok');
          }
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('executes after requested delay, runtime: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';
    const delay = 128;
    const [flag, setFlag] = useTestValue('not_ok');

    // Act
    await render(
      <TestComponent
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
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotify(notification);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('nested timeouts, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = useOrderConstraint();

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          setTimeout(() => {
            setTimeout(() => {
              order(2, notification2);
            });
            order(1, notification1);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(confirmedOrder.value).toBe(2);
  });

  test.each(['ui', 'worklet'])('timeouts order of execution, same time, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = useOrderConstraint();

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          setTimeout(() => {
            order(1, notification1);
          });
          setTimeout(() => {
            order(2, notification2);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(confirmedOrder.value).toBe(2);
  });

  test.each(['ui', 'worklet'])('timeouts order of execution, different times, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = useOrderConstraint();

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          setTimeout(() => {
            order(1, notification1);
          }, 50);
          setTimeout(() => {
            order(2, notification2);
          }, 70);
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2]);
    expect(confirmedOrder.value).toBe(2);
  });

  test.each(['ui', 'worklet'])(
    'timeouts order of execution, inverted scheduled order, runtime: **%s**',
    async runtimeType => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = useOrderConstraint();

      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            setTimeout(() => {
              order(2, notification2);
            }, 70);
            setTimeout(() => {
              order(1, notification1);
            }, 50);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );

  test.each(['ui', 'worklet'])('timeouts order of execution, nested timeouts, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
    const [confirmedOrder, order] = useOrderConstraint();

    // Act
    await render(
      <TestComponent
        worklet={() => {
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
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifications([notification1, notification2, notification3]);
    expect(confirmedOrder.value).toBe(3);
  });

  test.each(['ui', 'worklet'])(
    'timeouts order of execution, asynchronus scheduling, runtime: **%s**',
    async runtimeType => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = useOrderConstraint();

      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            setTimeout(() => {
              order(2, notification2);
            });
            order(1, notification1);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2]);
      expect(confirmedOrder.value).toBe(2);
    },
  );
});
