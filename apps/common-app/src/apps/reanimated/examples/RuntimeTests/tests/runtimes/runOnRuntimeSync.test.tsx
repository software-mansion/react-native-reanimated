import { createWorkletRuntime, runOnRuntimeSync } from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../ReJest/types';

describe('runOnRuntimeSync', () => {
  test('use runOnRuntimeSync to run a function on the Worker Runtime from RN Runtime', () => {
    // Arrange
    const workletRuntime = createWorkletRuntime({ name: 'test' });

    // Act
    const result = runOnRuntimeSync(workletRuntime, () => {
      'worklet';
      return 100;
    });

    // Assert
    expect(result).toBe(100, ComparisonMode.NUMBER);
  });
});
