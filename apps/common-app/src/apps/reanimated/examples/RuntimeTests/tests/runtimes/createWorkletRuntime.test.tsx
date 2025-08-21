import { createWorkletRuntime, scheduleOnRN } from 'react-native-worklets';
import { describe, expect, notify, test, waitForNotify } from '../../ReJest/RuntimeTestsApi';

const INITIALIZER_CALLED_NOTIFICATION = 'INITIALIZER_CALLED_NOTIFICATION';

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
    await waitForNotify(INITIALIZER_CALLED_NOTIFICATION);

    // Assert
    expect(initializerCalled).toBe(true);
    expect(runtime.name).toBe('test');
    expect(runtime.toString()).toBe('[WorkletRuntime "test"]');
  });
});
