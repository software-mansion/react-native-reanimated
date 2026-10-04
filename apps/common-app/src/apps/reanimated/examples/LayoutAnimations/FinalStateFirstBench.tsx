import React, { useRef, useState } from 'react';
import {
  Button,
  findNodeHandle,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  getStaticFeatureFlag,
  LinearTransition,
} from 'react-native-reanimated';

type NativeAnimationDevTools = {
  armNativeLayoutStart?: (
    tag: number,
    durationMs: number,
    delayMs: number,
    animatesOpacity: boolean,
    count: number
  ) => void;
};

const devTools = (
  globalThis as unknown as { __reanimatedModuleProxy: NativeAnimationDevTools }
).__reanimatedModuleProxy;

const DURATION = 8000;
const TRAVEL = 220;

export default function FinalStateFirstBench() {
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [boxPresses, setBoxPresses] = useState(0);
  const [trackPresses, setTrackPresses] = useState(0);
  const boxRef = useRef<Animated.View>(null);

  if (
    Platform.OS !== 'ios' ||
    devTools.armNativeLayoutStart === undefined ||
    !getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION')
  ) {
    return (
      <Text style={styles.label}>
        This bench needs a development build of the native code on iOS with the
        IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION flag.
      </Text>
    );
  }

  const move = () => {
    const tag = findNodeHandle(boxRef.current);
    if (typeof tag !== 'number') {
      return;
    }
    devTools.armNativeLayoutStart?.(tag, DURATION, 0, false, 1);
    setIsAtEnd((value) => !value);
  };

  return (
    <View style={styles.container}>
      <Button title="Move with the native host (8 s)" onPress={move} />
      <Text style={styles.label} accessibilityLabel="bench-counters">
        {`Box presses: ${boxPresses}. Track presses: ${trackPresses}. Final position: ${isAtEnd ? 'end' : 'start'}.`}
      </Text>
      <Pressable
        accessible={false}
        style={styles.track}
        onPress={() => setTrackPresses((count) => count + 1)}>
        <Animated.View
          ref={boxRef}
          layout={LinearTransition}
          style={[styles.mover, { marginLeft: isAtEnd ? TRAVEL : 0 }]}>
          <Pressable
            accessibilityLabel="bench-box"
            style={styles.box}
            onPress={() => setBoxPresses((count) => count + 1)}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  label: {
    fontSize: 16,
  },
  track: {
    height: 80,
    backgroundColor: 'lightgray',
  },
  mover: {
    width: 80,
  },
  box: {
    width: 80,
    height: 80,
    backgroundColor: 'teal',
  },
});
