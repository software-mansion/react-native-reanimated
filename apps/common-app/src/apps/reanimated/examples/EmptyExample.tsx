import React from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

// Repro: with Reduce Motion enabled, a view with an `entering` animation stays
// invisible (stuck at the animation's initial opacity 0).

export default function EmptyExample() {
  return (
    <Animated.View entering={FadeIn} style={styles.box}>
      <Text style={styles.text}>This text should be visible</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    margin: 32,
    padding: 32,
    backgroundColor: "salmon",
  },
  text: {
    fontSize: 24,
  },
});
