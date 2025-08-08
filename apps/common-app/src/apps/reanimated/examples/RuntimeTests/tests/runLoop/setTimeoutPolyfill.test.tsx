import React, { useEffect } from 'react';
import { View } from 'react-native';

import {
  describe,
  expect,
  notify,
  render,
  test,
  useTestState,
  waitForNotifies,
  waitForNotify,
} from '../../ReJest/RuntimeTestsApi';
import { createWorkletRuntime, runOnRuntime, runOnUI } from 'react-native-worklets';

function orderGuard() {
  'worklet';
  let lastExecuted = 0;
  return (expectedOrder: number) => {
    'worklet';
    lastExecuted = lastExecuted == expectedOrder - 1 ? expectedOrder : lastExecuted;
    return lastExecuted;
  };
}

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

describe('Test setTimeout', () => {
  test.each(['ui', 'worklet'])('executes single callback, runtime type: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          setTimeout(() => notify(notification));
        }}
        runtimeType={runtimeType}
      />,
    );

    await waitForNotify(notification);
  });

  test.each(['ui', 'worklet'])('passes parameters, runtime type: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';
    const argValue = 42;
    const [flag, setFlag] = useTestState('not_ok');

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

  test.each(['ui', 'worklet'])('increments handle on each request, runtime type: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState('not_ok');

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
    await waitForNotifies([notification1, notification2]);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])('executes after requested delay, runtime type: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';
    const delay = 128;
    const [flag, setFlag] = useTestState('not_ok');

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

  test.each(['ui', 'worklet'])('nested timeouts, runtime type: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          setTimeout(() => {
            setTimeout(() => {
              setFlag(order(2), notification2);
            });
            setFlag(order(1), notification1);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2]);
    expect(flag.value).toBe(2);
  });

  test.each(['ui', 'worklet'])('timeouts order of execution, same time, runtime type: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          setTimeout(() => {
            setFlag(order(1), notification1);
          });
          setTimeout(() => {
            setFlag(order(2), notification2);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2]);
    expect(flag.value).toBe(2);
  });

  test.each(['ui', 'worklet'])(
    'timeouts order of execution, different times, runtime type: **%s**',
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

            setTimeout(() => {
              setFlag(order(1), notification1);
            }, 50);
            setTimeout(() => {
              setFlag(order(2), notification2);
            }, 70);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifies([notification1, notification2]);
      expect(flag.value).toBe(2);
    },
  );

  test.each(['ui', 'worklet'])(
    'timeouts order of execution, inverted scheduled order, runtime type: **%s**',
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

            setTimeout(() => {
              setFlag(order(2), notification2);
            }, 70);
            setTimeout(() => {
              setFlag(order(1), notification1);
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

  test.each(['ui', 'worklet'])(
    'timeouts order of execution, nested timeouts, runtime type: **%s**',
    async runtimeType => {
      // Arrange
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [flag, setFlag] = useTestState<number>(0);

      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            const order = orderGuard();

            setTimeout(() => {
              setTimeout(() => {
                setFlag(order(2), notification2);
              }, 20);
              setFlag(order(1), notification1);
            }, 20);

            setTimeout(() => {
              setFlag(order(3), notification3);
            }, 100);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifies([notification1, notification2, notification3]);
      expect(flag.value).toBe(3);
    },
  );

  test.each(['ui', 'worklet'])(
    'timeouts order of execution, asynchronus scheduling, runtime type: **%s**',
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
            setTimeout(() => {
              setFlag(order(2), notification2);
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
