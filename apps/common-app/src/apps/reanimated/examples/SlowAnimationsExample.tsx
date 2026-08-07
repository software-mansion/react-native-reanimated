import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const INSTRUCTIONS = Platform.select({
  ios: 'select Debug > Slow Animations in the iOS Simulator menu bar',
  default:
    "select 'Toggle slow animations (Reanimated)' in the Dev Menu (press d in the Metro console)",
});

const ENTERING = FadeIn.duration(800);
const EXITING = FadeOut.duration(800);
const LAYOUT = LinearTransition.duration(800);

export default function SlowAnimationsExample() {
  const offset = useSharedValue(0);
  const [ids, setIds] = useState([0, 1, 2]);
  const nextId = useRef(3);

  useEffect(() => {
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(300, { duration: 1500, easing: Easing.linear }),
      -1,
      true
    );
  }, [offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.text}>
        While the animations below are running, {INSTRUCTIONS} to toggle slow
        animations. The animations should run slower (when enabled) or faster
        (when disabled).
      </Text>
      <Text style={styles.heading}>Timing animation</Text>
      <Text style={styles.text}>The box moves back and forth in a loop.</Text>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Text style={styles.heading}>Layout animations</Text>
      <Text style={styles.text}>
        Add and remove boxes – entering and exiting animations as well as
        layout transitions of the other boxes are also affected.
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
