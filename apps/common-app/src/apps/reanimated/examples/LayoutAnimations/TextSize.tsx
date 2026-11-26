import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  LinearTransition,
  withTiming,
} from 'react-native-reanimated';

const DURATION = 800;
const SMALL = 24;
const BIG = 32;

function fontSizeTransition(from: number, to: number): LayoutAnimationFunction {
  return (values) => {
    'worklet';
    return {
      initialValues: {
        originX: values.currentOriginX,
        originY: values.currentOriginY,
        width: values.currentWidth,
        height: values.currentHeight,
        fontSize: from,
      },
      animations: {
        originX: withTiming(values.targetOriginX, { duration: DURATION }),
        originY: withTiming(values.targetOriginY, { duration: DURATION }),
        width: withTiming(values.targetWidth, { duration: DURATION }),
        height: withTiming(values.targetHeight, { duration: DURATION }),
        fontSize: withTiming(to, { duration: DURATION }),
      },
    };
  };
}

const grow = fontSizeTransition(SMALL, BIG);
const shrink = fontSizeTransition(BIG, SMALL);

export default function TextSizeExample() {
  const [big, setBig] = useState(false);
  const fontSize = big ? BIG : SMALL;
  return (
    <View style={styles.container}>
      <Text style={styles.label}>LinearTransition</Text>
      <Animated.Text
        layout={LinearTransition.duration(DURATION)}
        style={[styles.text, { fontSize }]}>
        Morning tide
      </Animated.Text>
      <Text style={styles.label}>Nested Text with its own size</Text>
      <Animated.Text
        layout={LinearTransition.duration(DURATION)}
        style={[styles.text, { fontSize }]}>
        Quiet orchard <Text style={styles.nested}>(7 km)</Text>
      </Animated.Text>
      <Text style={styles.label}>Custom animation of fontSize</Text>
      <Animated.Text
        layout={big ? grow : shrink}
        style={[styles.text, { fontSize }]}>
        Granite ridge
      </Animated.Text>
      <Button
        testID="toggle"
        title={big ? 'Shrink' : 'Grow'}
        onPress={() => setBig((value) => !value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 13, color: '#57606a', marginTop: 12 },
  text: { alignSelf: 'flex-start', backgroundColor: '#dbe8fb' },
  nested: { fontSize: 14, color: '#57606a' },
});
