import { runOnUISync } from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../ReJest/types';

describe('runOnUISync', () => {
  test('use runOnUISync to run a function on the UI Runtime from RN Runtime', () => {
    // Arrange & Act
    const result = runOnUISync(() => {
      'worklet';
      return 100;
    });

    // Assert
    expect(result).toBe(100, ComparisonMode.NUMBER);
  });
});
