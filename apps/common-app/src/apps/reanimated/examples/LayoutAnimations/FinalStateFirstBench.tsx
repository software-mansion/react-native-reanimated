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
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const DURATION = 8000;
const TRAVEL = 220;
const DROP = 80;

// A spring has no native form, so a drop during a native move gives the view to the frame driver.
const MOVE_OR_SPRING_DROP: LayoutAnimationFunction = (values) => {
  'worklet';
  const isDrop = values.targetOriginY !== values.currentOriginY;
  return {
    initialValues: {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
    },
    animations: {
      originX: withTiming(values.targetOriginX, {
        duration: DURATION,
        easing: Easing.linear,
      }),
      originY: isDrop
        ? withSpring(values.targetOriginY)
        : withTiming(values.targetOriginY, {
            duration: DURATION,
            easing: Easing.linear,
          }),
    },
  };
};

export default function FinalStateFirstBench() {
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isDown, setIsDown] = useState(false);
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
      <Button
        title="Drop with a spring (frame driver)"
        onPress={() => setIsDown((value) => !value)}
      />
      <Text style={styles.label} accessibilityLabel="bench-counters">
        {`Box presses: ${boxPresses}. Track presses: ${trackPresses}. Final position: ${isAtEnd ? 'end' : 'start'}.`}
      </Text>
      <Pressable
        accessible={false}
        style={styles.track}
        onPress={() => setTrackPresses((count) => count + 1)}>
        <Animated.View
          layout={MOVE_OR_SPRING_DROP}
          style={[
            styles.mover,
            { marginLeft: isAtEnd ? TRAVEL : 0, marginTop: isDown ? DROP : 0 },
          ]}>
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
    height: 80 + DROP,
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
