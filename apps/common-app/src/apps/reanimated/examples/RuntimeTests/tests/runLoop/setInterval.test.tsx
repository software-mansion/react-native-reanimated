import React from 'react';

import {
  describe,
  expect,
  notify,
  render,
  test,
  createOrderConstraint,
  createTestValue,
  waitForNotifications,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';
import { DispatchTestComponent } from './DispatchTestComponent';
import { RuntimeKind } from 'react-native-worklets';

describe('Test setInterval', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])('executes single callback, runtime: **%s**', async runtimeKind => {
    // Arrange
    const [notification1, notification2, notification3] = ['iter1', 'iter2', 'iter3'];
    const [flag, setFlag] = createTestValue('not_ok');

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
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
        }}
        runtimeKind={runtimeKind}
      />,
    );

    await waitForNotifications([notification1, notification2, notification3]);
    expect(flag.value).toBe('ok');
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])('passes parameters, runtime: **%s**', async runtimeKind => {
    // Arrange
    const notification = 'callback';
    const argValue = 42;
    const [flag, setFlag] = createTestValue('not_ok');

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          const handle = setInterval(
            value => {
              if (value === argValue) {
                setFlag('ok');
              }
              clearInterval(handle);
              notify(notification);
            },
            1,
            argValue,
          );
        }}
        runtimeKind={runtimeKind}
      />,
    );

    await waitForNotification(notification);
    expect(flag.value).toBe('ok');
  });

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'increments handle on each request, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
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
    'executes after requested delay, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2, notification3] = ['iter1', 'iter2', 'iter3'];
      const delay = 64;
      const [flag, setFlag] = createTestValue('not_ok');

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            let lastTime = performance.now();
            let totalTime = 0;
            let iter = 1;
            const handle = setInterval(() => {
              const now = performance.now();
              totalTime += now - lastTime;
              lastTime = now;
              if (totalTime >= delay * iter) {
                setFlag('ok');
              } else {
                setFlag('not_ok');
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
          }}
          runtimeKind={runtimeKind}
        />,
      );

      // Assert
      await waitForNotifications([notification1, notification2, notification3]);
      expect(flag.value).toBe('ok');
    },
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])('nested intervals, runtime: **%s**', async runtimeKind => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [confirmedOrder, order] = createOrderConstraint();

    // Act
    await render(
      <DispatchTestComponent
        worklet={() => {
          'worklet';
          const handle1 = setInterval(() => {
            const handle2 = setInterval(() => {
              order(2, notification2);
              clearInterval(handle2);
            });
            order(1, notification1);
            clearInterval(handle1);
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
    'intervals order of execution, same time, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const handle1 = setInterval(() => {
              order(1, notification1);
              clearInterval(handle1);
            });
            const handle2 = setInterval(() => {
              order(2, notification2);
              clearInterval(handle2);
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
    'intervals order of execution, different times, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const handle1 = setInterval(() => {
              order(1, notification1);
              clearInterval(handle1);
            }, 50);
            const handle2 = setInterval(() => {
              order(2, notification2);
              clearInterval(handle2);
            }, 70);
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
    'intervals order of execution, inverted scheduled order, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const handle1 = setInterval(() => {
              order(2, notification2);
              clearInterval(handle1);
            }, 70);
            const handle2 = setInterval(() => {
              order(1, notification1);
              clearInterval(handle2);
            }, 50);
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
    'intervals order of execution, nested timeouts, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
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
    'intervals order of execution, asynchronous scheduling, runtime: **%s**',
    async runtimeKind => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [confirmedOrder, order] = createOrderConstraint();

      // Act
      await render(
        <DispatchTestComponent
          worklet={() => {
            'worklet';
            const handle1 = setInterval(() => {
              order(2, notification2);
              clearInterval(handle1);
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
