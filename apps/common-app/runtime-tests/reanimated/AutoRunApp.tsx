import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import AutoRunRuntimeTestsApp from '../AutoRunRuntimeTestsApp';
import { REANIMATED_TEST_SUITES } from './suites';

const WARM_UP_TIMEOUT_MS = 5000;

let resolveWarmUp: () => void;
const warmUpDone = new Promise<void>((resolve) => {
  resolveWarmUp = resolve;
});

function finishWarmUp() {
  resolveWarmUp();
}

function warmUp() {
  return warmUpDone;
}

// Pays UI-runtime init and frame-pipeline costs at app boot, so the first
// test's fixed wait budget starts against a warm pipeline. Capped so a broken
// warm-up can never block the run.
function WarmUpView() {
  const width = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  useEffect(() => {
    const timeoutId = setTimeout(finishWarmUp, WARM_UP_TIMEOUT_MS);
    width.value = withTiming(100, { duration: 100 }, () => {
      'worklet';
      runOnJS(finishWarmUp)();
    });
    return () => clearTimeout(timeoutId);
  }, [width]);
  return <Animated.View style={[styles.warmUpView, style]} />;
}

export default function ReanimatedAutoRunApp() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <WarmUpView />
      <AutoRunRuntimeTestsApp
        tests={REANIMATED_TEST_SUITES}
        library="Reanimated"
        warmUp={warmUp}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warmUpView: {
    height: 1,
  },
});
