import { createWorkletRuntime } from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

describe('createWorkletRuntime', () => {
  test('should create a worklet runtime by passing config with only name', () => {
    const runtime = createWorkletRuntime({
      name: 'test',
    });
    expect(runtime.name).toBe('test');
    expect(runtime.toString()).toBe('[WorkletRuntime "test"]');
  });

  test('should create a worklet runtime by passing config with name and initializer', () => {
    //  TODO: Check if initializer is called
    const initializer = () => {
      'worklet';
    };
    const runtime = createWorkletRuntime({
      name: 'test',
      initializer,
    });
    expect(runtime.name).toBe('test');
    expect(runtime.toString()).toBe('[WorkletRuntime "test"]');
  });
});
