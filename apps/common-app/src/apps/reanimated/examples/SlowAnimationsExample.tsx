import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import Animated, {
  css,
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDecay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const INSTRUCTIONS = Platform.select({
  ios: 'select Debug > Slow Animations in the iOS Simulator menu bar',
  default:
    "select 'Toggle slow animations (Reanimated)' in the Dev Menu (press d in the Metro console)",
});

const ENTERING = FadeIn.duration(200);
const EXITING = FadeOut.duration(200);
const LAYOUT = LinearTransition.duration(200);

const SPIN = css.keyframes({
  from: { transform: [{ rotate: '0deg' }] },
  to: { transform: [{ rotate: '360deg' }] },
});

const TRANSITION = {
  transitionProperty: 'transform',
  transitionDuration: 1000,
  transitionTimingFunction: 'linear',
} satisfies CSSTransitionProperties;

// The frame clock (requestAnimationFrame timestamps) is slowed down by slow
// animations while the wall clock (Date.now) is not, so a frame-to-wall time
// ratio well below 1 means slow animations are enabled.
function useDetectSlowAnimations() {
  const [slowEnabled, setSlowEnabled] = useState<boolean | null>(null);
  const detected = useSharedValue<boolean | null>(null);
  const prevRealTime = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    const realDelta = Date.now() - prevRealTime.value;
    prevRealTime.value = Date.now();
    const frameDelta = frameInfo.timeSincePreviousFrame;
    if (frameDelta === null || realDelta > 1000) {
      return; // first frame or the app was suspended
    }
    const slow = frameDelta / realDelta < 0.5;
    if (slow !== detected.value) {
      detected.value = slow;
      scheduleOnRN(setSlowEnabled, slow);
    }
  });

  return slowEnabled;
}

export default function SlowAnimationsExample() {
  const offset = useSharedValue(0);
  const springOffset = useSharedValue(0);
  const decayOffset = useSharedValue(0);
  const [springOn, setSpringOn] = useState(false);
  const [transitionOn, setTransitionOn] = useState(false);
  const [ids, setIds] = useState([0, 1, 2]);
  const nextId = useRef(3);
  const slowEnabled = useDetectSlowAnimations();

  useEffect(() => {
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(250, { duration: 1000, easing: Easing.linear }),
      -1,
      true
    );
  }, [offset]);

  useEffect(() => {
    springOffset.value = withSpring(springOn ? 250 : 0);
  }, [springOn, springOffset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const springStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: springOffset.value }],
  }));

  const decayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: decayOffset.value }],
  }));

  return (
    <ScrollView
      automaticallyAdjustsScrollIndicatorInsets={false}
      contentContainerStyle={styles.container}>
      <Text style={styles.text}>
        While the animations below are running, {INSTRUCTIONS} to toggle slow
        animations. The animations should run slower (when enabled) or faster
        (when disabled).
      </Text>
      <Text style={styles.text}>
        Slow animations are now{' '}
        {slowEnabled === null ? (
          <Text style={styles.bold}>not yet detected</Text>
        ) : slowEnabled ? (
          <Text style={[styles.bold, styles.enabled]}>🐢 enabled</Text>
        ) : (
          <Text style={[styles.bold, styles.disabled]}>❌ disabled</Text>
        )}
        {'\n'}(detected by comparing frame and wall clocks).
      </Text>
      <Text style={styles.heading}>Timing animation</Text>
      <Text style={styles.text}>The box moves back and forth in a loop.</Text>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Text style={styles.heading}>Spring animation</Text>
      <Text style={styles.text}>The box springs between two positions.</Text>
      <View style={styles.buttons}>
        <Button title="Toggle" onPress={() => setSpringOn((on) => !on)} />
      </View>
      <Animated.View style={[styles.box, springStyle]} />
      <Text style={styles.heading}>Decay animation</Text>
      <Text style={styles.text}>
        The box is flung with an initial velocity and decays to a stop.
      </Text>
      <View style={styles.buttons}>
        <Button
          title="Fling"
          onPress={() => {
            decayOffset.value = 0;
            decayOffset.value = withDecay({ velocity: 500, clamp: [0, 250] });
          }}
        />
      </View>
      <Animated.View style={[styles.box, decayStyle]} />
      <Text style={styles.heading}>CSS animation</Text>
      <Text style={styles.text}>
        The box rotates in a loop using a CSS animation.
      </Text>
      <Animated.View
        style={[
          styles.box,
          {
            animationName: SPIN,
            animationDuration: 3000,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          },
        ]}
      />
      <Text style={styles.heading}>CSS transition</Text>
      <Text style={styles.text}>
        The box slides between two positions using a CSS transition.
      </Text>
      <View style={styles.buttons}>
        <Button title="Toggle" onPress={() => setTransitionOn((on) => !on)} />
      </View>
      <Animated.View
        style={[
          styles.box,
          TRANSITION,
          { transform: [{ translateX: transitionOn ? 250 : 0 }] },
        ]}
      />
      <Text style={styles.heading}>Layout animations</Text>
      <Text style={styles.text}>
        Add and remove boxes – entering and exiting animations as well as layout
        transitions of the other boxes are also affected.
      </Text>
      <View style={styles.buttons}>
        <Button
          title="Add"
          onPress={() => setIds((prev) => [nextId.current++, ...prev])}
        />
        <Button
          title="Remove"
          onPress={() => setIds((prev) => prev.slice(1))}
        />
      </View>
      <View style={styles.boxes}>
        {ids.map((id) => (
          <Animated.View
            key={id}
            entering={ENTERING}
            exiting={EXITING}
            layout={LAYOUT}
            style={styles.smallBox}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  heading: {
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    marginBottom: 12,
  },
  bold: {
    fontWeight: 'bold',
  },
  enabled: {
    color: 'forestgreen',
  },
  disabled: {
    color: 'crimson',
  },
  box: {
    width: 60,
    height: 60,
    backgroundColor: 'navy',
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  boxes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallBox: {
    width: 40,
    height: 40,
    backgroundColor: 'navy',
  },
});
