import 'react-native-reanimated';

import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AutoRunRuntimeTestsApp from '../AutoRunRuntimeTestsApp';
import { REANIMATED_TEST_SUITES } from './suites';

export default function ReanimatedAutoRunApp() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AutoRunRuntimeTestsApp
        tests={REANIMATED_TEST_SUITES}
        library="Reanimated"
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
