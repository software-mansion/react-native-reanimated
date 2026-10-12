import React from 'react';
import { Button, DevSettings, StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

// Reproduction of an Android crash on a reload of the React instance:
//
//   JNI DETECTED ERROR IN APPLICATION: obj == null
//     in reanimated::NativeProxy::getAnimationTimestamp()
//
// React Native invalidates the native modules on a background thread, in the
// order in which they were first requested. If `ReanimatedModule` goes before
// `WorkletsModule`, the UI thread still runs worklets after Reanimated has
// released its Java part. Each worklet here starts an animation, which calls
// `_getAnimationTimestamp` on that Java part.
//
// Right before React Native invalidates the modules, it waits for the JS thread
// to finish its current task. Every JS task here ends by scheduling a batch of
// worklets, so the UI thread has just started a batch at that moment.
//
// How to run it (Android, debug build, because it reloads with `DevSettings`):
//
// 1. `WorkletsModule` is normally requested first, which hides the crash. Make
//    `ReanimatedModule` the first one with two temporary edits:
//    - in `packages/react-native-worklets/android/src/main/java/com/swmansion/worklets/WorkletsModule.kt`,
//      remove `needsEagerInit = true` from the `@ReactModule` annotation,
//    - in `packages/react-native-worklets/bundleMode/polyfills/prepareBundleMode.js`,
//      add `globalThis.nativeModuleProxy?.ReanimatedModule;` below `'use strict';`.
//      Metro bundles this file only in Bundle Mode, the default in `fabric-example`.
// 2. Restart Metro with `yarn workspace fabric-example start --reset-cache`,
//    because it caches that file, and rebuild the app with
//    `yarn workspace fabric-example android`.
// 3. Open this screen and press the button.
//
// The app then reloads and returns to this screen. Before `NativeProxy` stopped
// calling its Java part after the invalidation, it aborted on the first press.

const JS_TASK_MS = 100;
// Shorter than the JS task, so that the UI thread is free for the steps of the
// reload that run on it.
const UI_BATCH_MS = 60;
const WORKLET_MS = 0.5;
// The app does not reload in a release build.
const GIVE_UP_AFTER_MS = 5000;

function busyWait(ms: number) {
  'worklet';
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // Spin.
  }
}

function keepUIThreadBusy(sv: SharedValue<number>, deadline: number) {
  busyWait(JS_TASK_MS);
  for (let i = 0; i < UI_BATCH_MS / WORKLET_MS; i++) {
    scheduleOnUI(() => {
      'worklet';
      busyWait(WORKLET_MS);
      sv.value = withTiming(Math.random(), { duration: 100 });
    });
  }
  if (performance.now() < deadline) {
    setTimeout(() => keepUIThreadBusy(sv, deadline), 0);
  }
}

export default function ReloadDuringWorkletsCrashExample() {
  const sv = useSharedValue(0);

  const handlePress = () => {
    DevSettings.reload();
    keepUIThreadBusy(sv, performance.now() + GIVE_UP_AFTER_MS);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Reloads the app while the UI thread runs worklets that start animations.
        The app should come back to this screen.
      </Text>
      <Text style={styles.text}>
        This screen cannot crash on an unmodified build, because React Native
        invalidates Worklets before Reanimated. See the comment in
        ReloadDuringWorkletsCrashExample.tsx for the two temporary edits that
        reverse the order.
      </Text>
      <Button title="Reload while worklets run" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  text: {
    textAlign: 'center',
  },
});
