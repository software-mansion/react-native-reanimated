import React from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { BRAND_NAVY } from './colors';
import { highlightCode } from './highlightCode';

const CODE = `const hinge = useAnimatedSensor(
  SensorType.HINGE
);

const style = useAnimatedStyle(() => {
  const { angle, status } =
    hinge.sensor.value;

  // use hinge values as shared values
});`;

const HIGHLIGHTED_CODE = highlightCode(CODE);

const LONGEST_LINE_LENGTH = Math.max(
  ...CODE.split('\n').map((line) => line.length)
);

const MAX_FONT_SIZE = 32;
const HORIZONTAL_PADDING = 24;
// Glyphs are 0.6 em wide in Menlo and in the Android monospace font.
// The surplus prevents a wrap caused by rounding.
const GLYPH_WIDTH_TO_FONT_SIZE = 0.62;

interface HingeCodeExampleProps {
  isVisible: SharedValue<boolean>;
}

export default function HingeCodeExample({ isVisible }: HingeCodeExampleProps) {
  const { width: windowWidth } = useWindowDimensions();

  const lineWidth = windowWidth - 2 * HORIZONTAL_PADDING;
  const fontSizeThatFitsLongestLine =
    lineWidth / (LONGEST_LINE_LENGTH * GLYPH_WIDTH_TO_FONT_SIZE);
  const fontSize = Math.min(MAX_FONT_SIZE, fontSizeThatFitsLongestLine);

  const visibilityStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isVisible.value ? 1 : 0),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.container, visibilityStyle]}>
      <Text style={[styles.code, { fontSize }]}>
        {HIGHLIGHTED_CODE.map((token, index) => (
          <Text key={index} style={{ color: token.color }}>
            {token.text}
          </Text>
        ))}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    backgroundColor: BRAND_NAVY,
  },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
});
