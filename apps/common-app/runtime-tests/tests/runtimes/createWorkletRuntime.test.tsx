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
const EVENT_LOOP_CHECKED_NOTIFICATION = 'EVENT_LOOP_CHECKED_NOTIFICATION';

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

  test('should not provide the event loop when enableEventLoop is false', async () => {
    // Arrange
    let availableMethods: string[] = [];
    const onChecked = (methods: string[]) => {
      availableMethods = methods;
      notify(EVENT_LOOP_CHECKED_NOTIFICATION);
    };

    // Act
    const runtime = createWorkletRuntime({
      name: 'test',
      enableEventLoop: false,
    });
    scheduleOnRuntime(runtime, () => {
      'worklet';
      const methods = [
        'setTimeout',
        'setImmediate',
        'setInterval',
        'requestAnimationFrame',
        'queueMicrotask',
        'clearTimeout',
        'clearInterval',
        'clearImmediate',
        'cancelAnimationFrame',
      ];
      const globals = globalThis as unknown as Record<string, unknown>;
      scheduleOnRN(
        onChecked,
        methods.filter((method) => globals[method] !== undefined)
      );
    });
    await waitForNotification(EVENT_LOOP_CHECKED_NOTIFICATION);

    // Assert
    expect(availableMethods.length).toBe(0);
  });
});
