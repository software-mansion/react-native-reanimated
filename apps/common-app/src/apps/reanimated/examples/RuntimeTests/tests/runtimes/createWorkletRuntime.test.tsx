import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
} from 'react-native-worklets';
import {
  describe,
  expect,
  notify,
  test,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';

const INITIALIZER_CALLED_NOTIFICATION = 'INITIALIZER_CALLED_NOTIFICATION';
const LONG_INITIALIZER_NOTIFICATION = 'LONG_INITIALIZER_NOTIFICATION';
const SCHEDULED_WORKLET_NOTIFICATION = 'SCHEDULED_WORKLET_NOTIFICATION';

describe('createWorkletRuntime', () => {
  test('should create a worklet runtime by passing config with only name', () => {
    // Arrange & Act
    const runtime = createWorkletRuntime({
      name: 'test',
    });

    // Assert
    expect(runtime.name).toBe('test');
    expect(runtime.toString()).toBe('[WorkletRuntime "test"]');
  });

  test('should create a worklet runtime by passing config with name and initializer', async () => {
    // Arrange
    let initializerCalled = false;
    const onJSCallback = () => {
      initializerCalled = true;
      notify(INITIALIZER_CALLED_NOTIFICATION);
    };
    const initializer = () => {
      'worklet';
      scheduleOnRN(onJSCallback);
    };

    // Act
    const runtime = createWorkletRuntime({
      name: 'test',
      initializer,
    });
    await waitForNotification(INITIALIZER_CALLED_NOTIFICATION);

    // Assert
    expect(initializerCalled).toBe(true);
    expect(runtime.name).toBe('test');
    expect(runtime.toString()).toBe('[WorkletRuntime "test"]');
  });

  test('should run a long-running initializer on a runtime with disabled locking', async () => {
    // Arrange
    let initializerDuration = 0;
    let scheduledValue = 0;
    const onInitializerDone = (duration: number) => {
      initializerDuration = duration;
      notify(LONG_INITIALIZER_NOTIFICATION);
    };
    const onWorkletDone = (value: number) => {
      scheduledValue = value;
      notify(SCHEDULED_WORKLET_NOTIFICATION);
    };
    const initializer = () => {
      'worklet';
      const start = performance.now();
      let elapsed = 0;
      while (elapsed < 500) {
        elapsed = performance.now() - start;
      }
      scheduleOnRN(onInitializerDone, elapsed);
    };

    // Act
    const runtime = createWorkletRuntime({
      name: 'test',
      enableLocking: false,
      initializer,
    });
    await waitForNotification(LONG_INITIALIZER_NOTIFICATION);
    scheduleOnRuntime(runtime, () => {
      'worklet';
      scheduleOnRN(onWorkletDone, 42);
    });
    await waitForNotification(SCHEDULED_WORKLET_NOTIFICATION);

    // Assert
    expect(initializerDuration >= 500).toBe(true);
    expect(scheduledValue).toBe(42);
    expect(runtime.name).toBe('test');
  });
});
