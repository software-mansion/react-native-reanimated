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
  wait,
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
    let timeoutCallbackFired = false;
    const onChecked = (methods: string[]) => {
      availableMethods = methods;
      notify(EVENT_LOOP_CHECKED_NOTIFICATION);
    };
    const onTimeoutCallbackFired = () => {
      timeoutCallbackFired = true;
    };

    // Act
    // @ts-expect-error - `enableEventLoop` accepts only `true`.
    const runtime = createWorkletRuntime({
      name: 'test',
      enableEventLoop: false,
    });
    scheduleOnRuntime(runtime, () => {
      'worklet';
      const globals = globalThis as unknown as {
        __runTimeoutCallback?: (handlerId: number) => void;
        _scheduleTimeoutCallback?: (delay: number, handlerId: number) => void;
      } & Record<string, unknown>;
      globals.__runTimeoutCallback = () => {
        scheduleOnRN(onTimeoutCallbackFired);
      };
      globals._scheduleTimeoutCallback?.(0, 1);
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
      scheduleOnRN(
        onChecked,
        methods.filter((method) => globals[method] !== undefined)
      );
    });
    await waitForNotification(EVENT_LOOP_CHECKED_NOTIFICATION);
    await wait(300);

    // Assert
    expect(availableMethods.length).toBe(0);
    expect(timeoutCallbackFired).toBe(false);
  });
});
