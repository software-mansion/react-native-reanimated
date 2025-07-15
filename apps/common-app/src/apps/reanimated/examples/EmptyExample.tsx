import React, { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnUI,
} from 'react-native-reanimated';

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 350;
const CLAMP_MARKER_HEIGHT = 20;
const CLAMP_MARKER_WIDTH = 50;
const CLAMP_MARKER_OFFSET = 20;

const LOWER_SPRING_TO_VALUE = CLAMP_MARKER_WIDTH + CLAMP_MARKER_OFFSET;
const UPPER_SPRING_TO_VALUE =
  FRAME_WIDTH - (CLAMP_MARKER_WIDTH + CLAMP_MARKER_OFFSET);

const RELATIVE_LOWER_SPRING_TO_VALUE = 0;
const RELATIVE_UPPER_SPRING_TO_VALUE = 0.03;
const RELATIVE_COEFFICIENT =
  (UPPER_SPRING_TO_VALUE - LOWER_SPRING_TO_VALUE) /
  (RELATIVE_UPPER_SPRING_TO_VALUE - RELATIVE_LOWER_SPRING_TO_VALUE);

function Visualiser({
  testedStyle,
  description,
}: {
  testedStyle: ViewStyle;
  description: string;
}) {
  return (
    <>
      <Text style={styles.text}>{description}</Text>
      <View
        style={{
          width: FRAME_WIDTH + 2 * BORDER_WIDTH,
          borderWidth: BORDER_WIDTH,
          borderColor: VIOLET,
        }}>
        <View>
          <View
            style={[
              styles.toValueMarker,
              {
                width: LOWER_SPRING_TO_VALUE,
              },
            ]}
          />
          <View
            style={[
              styles.clampMarker,
              {
                width: CLAMP_MARKER_WIDTH,
              },
            ]}
          />
        </View>
        <Animated.View style={[styles.movingBox, testedStyle]} />
        <View>
          <View
            style={[
              styles.toValueMarker,
              {
                marginTop: -CLAMP_MARKER_HEIGHT / 2,
                width: LOWER_SPRING_TO_VALUE,
                alignSelf: 'flex-end',
              },
            ]}
          />
          <View
            style={[
              styles.clampMarker,
              {
                marginTop: -50,
                width: CLAMP_MARKER_WIDTH,
                alignSelf: 'flex-end',
              },
            ]}
          />
        </View>
      </View>
    </>
  );
}

export default function SpringComparisonExample() {
  const configNoTimingWidth = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [configNoTimingWidthToggle, setConfigNoTimingWidthToggle] =
    useState(false);

  const configTimingWidth = useSharedValue(LOWER_SPRING_TO_VALUE);
  const [configTimingWidthToggle, setConfigTimingWidthToggle] = useState(false);

  const newDefaultNoTimingConfig = {
    damping: 120,
    mass: 4,
    // stiffness: 900,
    stiffness: 3600,
  };

  const newDefaultTimingConfig = {
    duration: 550,
    // dampingRatio: 1,
    dampingRatio: 0.5,
  };

  const newDefaultConfigNoTimingStyle = useAnimatedStyle(() => {
    const start = performance.now();
    return {
      width: withSpring(
        configNoTimingWidth.value,
        newDefaultNoTimingConfig,
        () => {
          'worklet';
          const end = performance.now();
          console.log(
            `New default config, no timing, animation took ${end - start} ms`
          );
        }
      ),
    };
  });

  const newDefaultConfigTimingStyle = useAnimatedStyle(() => {
    const start = performance.now();
    return {
      width: withSpring(configTimingWidth.value, newDefaultTimingConfig, () => {
        'worklet';
        const end = performance.now();
        console.log(
          `New default config, timing, animation took ${end - start} ms`
        );
      }),
    };
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <>
        <Visualiser
          testedStyle={newDefaultConfigNoTimingStyle}
          description="New default config, no timing"
        />
        <Button
          title="toggle"
          onPress={() => {
            configNoTimingWidth.value = configNoTimingWidthToggle
              ? LOWER_SPRING_TO_VALUE
              : UPPER_SPRING_TO_VALUE;
            setConfigNoTimingWidthToggle(!configNoTimingWidthToggle);
          }}
        />
      </>

      <>
        <Visualiser
          testedStyle={newDefaultConfigTimingStyle}
          description="New default config, timing"
        />
        <Button
          title="toggle"
          onPress={() => {
            configTimingWidth.value = configTimingWidthToggle
              ? LOWER_SPRING_TO_VALUE
              : UPPER_SPRING_TO_VALUE;
            setConfigTimingWidthToggle(!configTimingWidthToggle);
          }}
        />
      </>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: '21.37%',
    flex: 1,
    flexDirection: 'column',
    padding: CLAMP_MARKER_HEIGHT,
    paddingBottom: '21.37%',
  },
  content: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  toValueMarker: {
    position: 'absolute',
    margin: 0,
    opacity: 1,
    zIndex: 100,
    height: CLAMP_MARKER_HEIGHT / 2,
    backgroundColor: VIOLET,
  },
  clampMarker: {
    position: 'absolute',
    margin: 0,
    opacity: 0.5,
    height: 50,
    backgroundColor: VIOLET,
  },
  movingBox: {
    zIndex: 1,
    height: 50,
    opacity: 0.5,
    backgroundColor: 'black',
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
    textAlign: 'right',
  },
});
