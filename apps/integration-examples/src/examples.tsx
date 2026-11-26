import { StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useCounter as useUiToNativeCounter } from 'ui-to-native/reanimated';
import { useCounter as useCppTurboModuleCounter } from 'with-cpp-turbomodule/reanimated';
import {
  useCounter as useExpoModuleCounter,
  useCounterOnEachFrame as useExpoModuleCounterOnEachFrame,
} from 'with-expo-module/reanimated';
import { useCounter as useNitroCounter } from 'with-nitro/reanimated';
import {
  AnimatedCounterView,
  useCountHandler,
} from 'with-view-event/reanimated';

import { CounterDisplay } from './CounterDisplay';

export const examples = [
  { id: 'with-expo-module', title: 'Expo module', Screen: ExpoModuleExample },
  {
    id: 'with-expo-module-frames',
    title: 'Expo module, read on each frame',
    Screen: ExpoModuleFramesExample,
  },
  {
    id: 'with-cpp-turbomodule',
    title: 'C++ TurboModule',
    Screen: CppTurboModuleExample,
  },
  { id: 'with-nitro', title: 'Nitro module', Screen: NitroExample },
  { id: 'with-view-event', title: 'View event', Screen: ViewEventExample },
  { id: 'ui-to-native', title: 'UI to native', Screen: UiToNativeExample },
];

function ExpoModuleExample() {
  return <CounterDisplay count={useExpoModuleCounter()} />;
}

function ExpoModuleFramesExample() {
  return <CounterDisplay count={useExpoModuleCounterOnEachFrame()} />;
}

function CppTurboModuleExample() {
  return <CounterDisplay count={useCppTurboModuleCounter()} />;
}

function NitroExample() {
  return <CounterDisplay count={useNitroCounter()} />;
}

function ViewEventExample() {
  const count = useSharedValue(0);
  const onCount = useCountHandler({
    onCount: (event) => {
      'worklet';
      count.set(event.count);
    },
  });

  return (
    <>
      <AnimatedCounterView style={styles.hidden} onCount={onCount} />
      <CounterDisplay count={count} />
    </>
  );
}

function UiToNativeExample() {
  return <CounterDisplay count={useUiToNativeCounter()} />;
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});
