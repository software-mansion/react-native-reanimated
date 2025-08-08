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

describe('Test clearImmediate', () => {
  test.each(['ui', 'worklet'])('does nothing on invalid handle, runtime: **%s**', async runtimeType => {
    // Arrange
    const notification = 'callback';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          clearImmediate(2137);
          setImmediate(() => notify(notification));
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotify(notification);
  });

  test.each(['ui', 'worklet'])(
    'cancels scheduled callback outside of execution loop, runtime: **%s**',
    async runtimeType => {
      // Arrange
      const notification = 'callback2';
      const [flag, setFlag] = useTestState('ok');

      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            const handle = setImmediate(() => {
              setFlag('not_ok');
            }) as unknown as number;
            setImmediate(() => notify(notification));
            clearImmediate(handle);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotify(notification);
      expect(flag.value).toBe('ok');
    },
  );

  test.each(['ui', 'worklet'])('cancels flushed callback within execution loop, runtime: **%s**', async runtimeType => {
    // Arrange
    const [notification1, notification2] = ['callback1', 'callback1'];
    const [flag, setFlag] = useTestState('ok');

    // Act
    await render(
      <TestComponent
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
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotifies([notification1, notification2]);
    expect(flag.value).toBe('ok');
  });

  test.each(['ui', 'worklet'])(
    'cancels scheduled callback within execution loop, runtime: **%s**',
    async runtimeType => {
      // Arrange
      const [notification1, notification2, notification3] = ['callback1', 'callback2', 'callback3'];
      const [flag, setFlag] = useTestState('ok');

      // Act
      await render(
        <TestComponent
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
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifies([notification1, notification2, notification3]);
      expect(flag.value).toBe('ok');
    },
  );
});
