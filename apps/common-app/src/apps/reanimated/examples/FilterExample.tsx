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
  const uri =
    'https://fastly.picsum.photos/id/418/400/400.jpg?hmac=bb10nb5u-sK8fxD4fyTmZO36Q4N6jRTuSj-ChqtM_3M';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <Text>brightness</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, brightness]}
      />

      <Text>opacity</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, opacity]}
      />
      {/* // to-do */}
      <Text>blur (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, blur]}
      />

      <Text>contrast (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, contrast]}
      />

      <Text>dropShadow (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, dropShadow]}
      />

      <Text>grayscale (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, grayscale]}
      />

      {/* // to-do */}
      <Text>hueRotate (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, hueRotate]}
      />

      <Text>invert (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, invert]}
      />

      <Text>sepia (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, sepia]}
      />

      <Text>saturate (only Android)</Text>
      <Animated.Image
        source={{ uri: uri }}
        // @ts-ignore
        style={[styles.image, saturate]}
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
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
});
