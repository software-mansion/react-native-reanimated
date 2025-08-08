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

describe('Test setImmediate', () => {
  test.each(['ui', 'worklet'])('executes single callback, runtime: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';
    const [flag, setFlag] = useTestState('not_ok');

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          setImmediate(() => setFlag('ok', notification));
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
    const [flag, setFlag] = useTestState('not_ok');

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          setImmediate(value => {
            if (value === argValue) {
              setFlag('ok');
            }
            notify(notification);
          }, argValue);
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
          const handle1 = setImmediate(() => notify(notification1)) as unknown as number;
          const handle2 = setImmediate(() => notify(notification2)) as unknown as number;

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

  test.each(['ui', 'worklet'])('nested tasks, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          setImmediate(() => {
            setImmediate(() => {
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

  test.each(['ui', 'worklet'])('tasks order of execution, same time, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback2'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          setImmediate(() => {
            setFlag(order(1), notification1);
          });
          setImmediate(() => {
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

  test.each(['ui', 'worklet'])('tasks order of execution, nested timeouts, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
    const [flag, setFlag] = useTestState<number>(0);

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          const order = orderGuard();

          setImmediate(() => {
            setImmediate(() => {
              setFlag(order(3), notification2);
            });
            setFlag(order(1), notification1);
          });
          setImmediate(() => {
            setFlag(order(2), notification3);
          });
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2, notification3]);
    expect(flag.value).toBe(3);
  });

  test.each(['ui', 'worklet'])(
    'tasks order of execution, asynchronus scheduling, runtime: **%s**',
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
            setImmediate(() => {
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
