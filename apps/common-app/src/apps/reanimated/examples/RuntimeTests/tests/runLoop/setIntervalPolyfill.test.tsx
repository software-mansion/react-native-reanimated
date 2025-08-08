import React, { useEffect } from 'react';
import { View } from 'react-native';

import {
  describe,
  expect,
  notify,
  orderGuard,
  render,
  test,
  useTestState,
  waitForNotifies,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';
import { createWorkletRuntime, runOnRuntime, runOnUI } from 'react-native-worklets';

const TestComponent = ({ worklet, runtimeType }: { worklet: () => void; runtimeType: string }) => {
  useEffect(() => {
    if (runtimeType === 'ui') {
      runOnUI(() => {
        'worklet';
        worklet();
      })();
    } else {
      const rt = createWorkletRuntime({ name: 'testRuntime' });
      runOnRuntime(rt, () => {
        'worklet';
        worklet();
      })();
    }
  });

  return <View />;
};

describe('Test setInterval', () => {
  test.each(['ui', 'worklet'])('executes single callback, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2, notification3] = ['iter1', 'iter2', 'iter3'];
    const [flag, setFlag] = useTestState('not_ok');

    // Act
    await render(
      <TestComponent
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
        runtimeType={runtimeType}
      />,
    );

    await waitForNotifies([notification1, notification2, notification3]);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('passes parameters, runtime: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';
    const argValue = 42;
    const [flag, setFlag] = useTestState('not_ok');

    // Act
    await render(
      <TestComponent
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
        runtimeType={runtimeType}
      />,
    );

    await waitForNotify(notification);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('increments handle on each request, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState('not_ok');

    // Act
    await render(
      <TestComponent
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
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2]);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('executes after requested delay, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2, notification3] = ['iter1', 'iter2', 'iter3'];
    const delay = 64;
    const [flag, setFlag] = useTestState('not_ok');

    // Act
    await render(
      <TestComponent
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
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2, notification3]);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('nested intervals, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          const handle1 = setInterval(() => {
            const handle2 = setInterval(() => {
              setFlag(order(2), notification2);
              clearInterval(handle2);
            });
            setFlag(order(1), notification1);
            clearInterval(handle1);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2]);
    expect(flag.value).toBe(2);
  });

  test.each(['ui', 'worklet'])('intervals order of execution, same time, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          const handle1 = setInterval(() => {
            setFlag(order(1), notification1);
            clearInterval(handle1);
          });
          const handle2 = setInterval(() => {
            setFlag(order(2), notification2);
            clearInterval(handle2);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2]);
    expect(flag.value).toBe(2);
  });

  test.each(['ui', 'worklet'])('intervals order of execution, different times, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          const handle1 = setInterval(() => {
            setFlag(order(1), notification1);
            clearInterval(handle1);
          }, 50);
          const handle2 = setInterval(() => {
            setFlag(order(2), notification2);
            clearInterval(handle2);
          }, 70);
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2]);
    expect(flag.value).toBe(2);
  });

  test.each(['ui', 'worklet'])(
    'intervals order of execution, inverted scheduled order, runtime: **%s**',
    async runtimeType => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = useTestState<number>(0);

      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            const order = orderGuard();

            const handle1 = setInterval(() => {
              setFlag(order(2), notification2);
              clearInterval(handle1);
            }, 70);
            const handle2 = setInterval(() => {
              setFlag(order(1), notification1);
              clearInterval(handle2);
            }, 50);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifies([notification1, notification2]);
      expect(flag.value).toBe(2);
    },
  );

  test.each(['ui', 'worklet'])('intervals order of execution, nested timeouts, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          const handle1 = setInterval(() => {
            const handle2 = setInterval(() => {
              setFlag(order(2), notification2);
              clearInterval(handle2);
            }, 20);
            setFlag(order(1), notification1);
            clearInterval(handle1);
          }, 20);

          const handle3 = setInterval(() => {
            setFlag(order(3), notification3);
            clearInterval(handle3);
          }, 100);
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2, notification3]);
    expect(flag.value).toBe(3);
  });

  test.each(['ui', 'worklet'])(
    'intervals order of execution, asynchronus scheduling, runtime: **%s**',
    async runtimeType => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback2'];
      const [flag, setFlag] = useTestState<number>(0);

      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            const order = orderGuard();
            const handle1 = setInterval(() => {
              setFlag(order(2), notification2);
              clearInterval(handle1);
            });
            setFlag(order(1), notification1);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifies([notification1, notification2]);
      expect(flag.value).toBe(2);
    },
  );
});
