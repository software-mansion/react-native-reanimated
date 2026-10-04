import React, { useState } from 'react';
import {
  Button,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  withTiming,
} from 'react-native-reanimated';

const DURATION = 8000;
const TRAVEL = 220;

// Position leaves with a linear easing: the subset that the native host plays.
const NATIVE_MOVE: LayoutAnimationFunction = (values) => {
  'worklet';
  const config = { duration: DURATION, easing: Easing.linear };
  return {
    initialValues: {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
    },
    animations: {
      originX: withTiming(values.targetOriginX, config),
      originY: withTiming(values.targetOriginY, config),
    },
  };
};

export default function FinalStateFirstBench() {
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [boxPresses, setBoxPresses] = useState(0);
  const [trackPresses, setTrackPresses] = useState(0);

  if (
    Platform.OS !== 'ios' ||
    !getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION')
  ) {
    return (
      <Text style={styles.label}>
        This bench needs iOS with the IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION flag.
      </Text>
    );
  }

  const move = () => setIsAtEnd((value) => !value);

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
          layout={NATIVE_MOVE}
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
