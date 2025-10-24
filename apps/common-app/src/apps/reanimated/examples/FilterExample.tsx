import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// TO-DO: add string percentage examples
export default function FilterExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [sv]);

  // https://reactnative.dev/docs/view-style-props#filter

  const brightness = useAnimatedStyle(() => {
    return { filter: [{ brightness: sv.value }] };
  });

  const opacity = useAnimatedStyle(() => {
    return { filter: [{ opacity: sv.value }] };
  });

  const blur = useAnimatedStyle(() => {
    return { filter: [{ blur: sv.value * 10 }] };
  });

  const contrast = useAnimatedStyle(() => {
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
            color: interpolateColor(sv.value, [0, 1], ['red', 'blue']),
          },
        },
      ],
    };
  });

  const grayscale = useAnimatedStyle(() => {
    return { filter: [{ grayscale: sv.value }] };
  });

  const hueRotate = useAnimatedStyle(() => {
    return { filter: [{ hueRotate: sv.value * 360 }] };
  });

  const invert = useAnimatedStyle(() => {
    return { filter: [{ invert: sv.value }] };
  });

  const sepia = useAnimatedStyle(() => {
    return { filter: [{ sepia: sv.value }] };
  });

  const saturate = useAnimatedStyle(() => {
    return { filter: [{ saturate: sv.value * 2 }] };
  });

  // TODO: replace back with Balloons image when asset problem is fixed.
  const uri = 'https://unsplash.it/400/400?image=1';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <Text>brightness</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={brightness}
        width={80}
        height={80}
      />
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={brightnessString}
        width={80}
        height={80}
      />

      <Text>opacity</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={opacity}
        width={80}
        height={80}
      />

      <Text>blur (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={blur}
        width={80}
        height={80}
      />

      <Text>contrast (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={contrast}
        width={80}
        height={80}
      />

      <Text>dropShadow (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={dropShadow}
        width={80}
        height={80}
      />

      <Text>grayscale (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={grayscale}
        width={80}
        height={80}
      />

      <Text>hueRotate (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={hueRotate}
        width={80}
        height={80}
      />

      <Text>invert (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={invert}
        width={80}
        height={80}
      />

      <Text>sepia (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={sepia}
        width={80}
        height={80}
      />

      <Text>saturate (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
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
