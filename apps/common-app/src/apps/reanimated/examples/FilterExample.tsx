import { balloonsImage } from '@/apps/css/assets';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Animated, {
  interpolateColor,
  processColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function FilterExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [sv]);

  // https://reactnative.dev/docs/view-style-props#filter

  const brightness = useAnimatedStyle(() => {
    // TODO: support percentage string
    return { filter: [{ brightness: sv.value }] };
  });

  const opacity = useAnimatedStyle(() => {
    // TODO: support percentage string
    return { filter: [{ opacity: sv.value }] };
  });

  const blur = useAnimatedStyle(() => {
    return { filter: [{ blur: sv.value * 10 }] };
  });

  const contrast = useAnimatedStyle(() => {
    // TODO: support percentage string
    return { filter: [{ contrast: sv.value * 3 }] };
  });

  const dropShadow = useAnimatedStyle(() => {
    return {
      filter: [
        {
          dropShadow: {
            offsetX: sv.value * 10,
            offsetY: sv.value * 10,
            standardDeviation: sv.value * 10,
            // TODO: call processColor automatically
            color: processColor(
              interpolateColor(sv.value, [0, 1], ['red', 'blue'])
            ),
          },
        },
      ],
    };
  });

  const grayscale = useAnimatedStyle(() => {
    // TODO: support percentage string
    return { filter: [{ grayscale: sv.value }] };
  });

  const hueRotate = useAnimatedStyle(() => {
    // TODO: support deg and rad string
    return { filter: [{ hueRotate: sv.value * 360 }] };
  });

  const invert = useAnimatedStyle(() => {
    // TODO: support percentage string
    return { filter: [{ invert: sv.value }] };
  });

  const sepia = useAnimatedStyle(() => {
    // TODO: support percentage string
    return { filter: [{ sepia: sv.value }] };
  });

  const saturate = useAnimatedStyle(() => {
    return { filter: [{ saturate: sv.value * 2 }] };
  });

  // TODO: support filter string

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <Text>brightness</Text>
      <Animated.Image
        source={balloonsImage}
        style={brightness}
        width={80}
        height={80}
      />

      <Text>opacity</Text>
      <Animated.Image
        source={balloonsImage}
        style={opacity}
        width={80}
        height={80}
      />

      <Text>blur (only Android)</Text>
      <Animated.Image
        source={balloonsImage}
        style={blur}
        width={80}
        height={80}
      />

      <Text>contrast (only Android)</Text>
      <Animated.Image
        source={balloonsImage}
        style={contrast}
        width={80}
        height={80}
      />

      <Text>dropShadow (only Android)</Text>
      <Animated.Image
        source={balloonsImage}
        style={dropShadow}
        width={80}
        height={80}
      />

      <Text>grayscale (only Android)</Text>
      <Animated.Image
        source={balloonsImage}
        style={grayscale}
        width={80}
        height={80}
      />

      <Text>hueRotate (only Android)</Text>
      <Animated.Image
        source={balloonsImage}
        style={hueRotate}
        width={80}
        height={80}
      />

      <Text>invert (only Android)</Text>
      <Animated.Image
        source={balloonsImage}
        style={invert}
        width={80}
        height={80}
      />

      <Text>sepia (only Android)</Text>
      <Animated.Image
        source={balloonsImage}
        style={sepia}
        width={80}
        height={80}
      />

      <Text>saturate (only Android)</Text>
      <Animated.Image
        source={balloonsImage}
        style={saturate}
        width={80}
        height={80}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
});
