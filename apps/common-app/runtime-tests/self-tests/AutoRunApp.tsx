import 'react-native-reanimated';

import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AutoRunRuntimeTestsApp from '../AutoRunRuntimeTestsApp';
import { SELF_TEST_SUITES } from './suites';

export default function SelfTestsAutoRunApp() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AutoRunRuntimeTestsApp tests={SELF_TEST_SUITES} library="Self-Tests" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
