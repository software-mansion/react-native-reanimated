import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expectSharedValue,
  notify,
  registerValue,
  render,
  test,
  waitForNotification,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

const SHARED_VALUE_REF = 'convergenceSharedValue';
const UI_WRITE_NOTIFICATION = 'uiWriteDone';
const VALUE_WRITTEN_ON_UI = 42;

const ConvergenceComponent = () => {
  const sharedValue = useSharedValue(0);
  registerValue(SHARED_VALUE_REF, sharedValue);

  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      sharedValue.value = VALUE_WRITTEN_ON_UI;
      notify(UI_WRITE_NOTIFICATION);
    });
  }, [sharedValue]);

  return <View style={styles.container} />;
};

describe('Test shared value convergence across runtimes', () => {
  test('JS copy converges after a write on the UI runtime', async () => {
    await render(<ConvergenceComponent />);
    await waitForNotification(UI_WRITE_NOTIFICATION);

    await expectSharedValue(SHARED_VALUE_REF).toConverge(
      VALUE_WRITTEN_ON_UI,
      ComparisonMode.NUMBER
    );
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
