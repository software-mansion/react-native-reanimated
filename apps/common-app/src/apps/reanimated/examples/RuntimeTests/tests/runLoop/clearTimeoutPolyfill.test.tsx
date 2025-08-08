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

describe('Test clearTimeout', () => {
  test.each(['ui', 'worklet'])('does nothing on invalid handle', async runtimeType => {
    // Arrange
    const notification = 'callback';

    // Act
    await render(
      <TestComponent
        worklet={() => {
          'worklet';
          clearTimeout(2137);
          setTimeout(() => notify(notification));
        }}
        runtimeType={runtimeType}
      />,
    );

    // Assert
    await waitForNotify(notification);
  });

  test.each(['ui', 'worklet'])(
    'cancels scheduled callback outside of execution loop, runtime type: **%s**',
    async runtimeType => {
      // Arrange
      const notification = 'callback2';
      const [flag, setFlag] = useTestState('ok');

      // Act
      await render(
        <TestComponent
          worklet={() => {
            'worklet';
            const handle = setTimeout(() => {
              setFlag('not_ok');
            }) as unknown as number;
            setTimeout(() => notify(notification));
            clearTimeout(handle);
          }}
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotify(notification);
      expect(flag.value).toBe('ok');
    },
  );

  test.each(['ui', 'worklet'])(
    'cancels flushed callback within execution loop, runtime type: **%s**',
    async runtimeType => {
      // Arrange
      const [notification1, notification2] = ['callback1', 'callback3'];
      const [flag, setFlag] = useTestState('ok');

      // Act
      await render(
        <TestComponent
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
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifies([notification1, notification2]);
      expect(flag.value).toBe('ok');
    },
  );

  test.each(['ui', 'worklet'])(
    'cancels scheduled callback within execution loop, runtime type: **%s**',
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
          runtimeType={runtimeType}
        />,
      );

      // Assert
      await waitForNotifies([notification1, notification2, notification3]);
      expect(flag.value).toBe('ok');
    },
  );
});
