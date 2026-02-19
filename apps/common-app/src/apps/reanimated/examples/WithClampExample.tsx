import React, { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withClamp,
  withSpring,
  type AnimatedStyle,
} from 'react-native-reanimated';

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 300;
const CLAMP_MARKER_HEIGHT = 40;

// Modify this values to change clamp limits
const LOWER_BOUND = 120;
const UPPER_BOUND = 220;

const LOWER_SPRING_TO_VALUE = 150;
const UPPER_SPRING_TO_VALUE = 200;

function Example({
  testedStyle,
  description,
}: {
  testedStyle: AnimatedStyle;
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
                width: LOWER_BOUND,
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
                width: FRAME_WIDTH - UPPER_SPRING_TO_VALUE,
                alignSelf: 'flex-end',
              },
            ]}
          />
          <View
            style={[
              styles.clampMarker,
              {
                marginTop: -100,
                width: FRAME_WIDTH - UPPER_BOUND,
                alignSelf: 'flex-end',
              },
            ]}
          />
        </View>
      </View>
    </>
  );
}

export default function AnimatedStyleUpdateExample() {
  const randomWidth = useSharedValue(100);
  const rotation = useSharedValue('0deg');
  const [toggle, setToggle] = useState(false);

  const config = {
    duration: 25000,
    dampingRatio: 0.075,
  };

  const clampedStyleWithAnimationModifier = useAnimatedStyle(() => {
    return {
      width: withClamp(
        { min: LOWER_BOUND, max: UPPER_BOUND },
        withSpring(randomWidth.value, config)
      ),
    };
  });

  const clampedStyleWithConfig = useAnimatedStyle(() => {
    return {
      width: withSpring(randomWidth.value, {
        ...config,
        clamp: { min: LOWER_BOUND, max: UPPER_BOUND },
      }),
    };
  });

  const style = useAnimatedStyle(() => {
    return {
      width: withSpring(randomWidth.value, config),
    };
  });

  const rotationStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withClamp(
            { min: '-45deg', max: '180deg' },
            withSpring(rotation.value)
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Example
        testedStyle={clampedStyleWithAnimationModifier}
        description="Clamped spring with withClamp HOC"
      />
      <Example
        testedStyle={clampedStyleWithConfig}
        description="Clamped spring with clamp config property"
      />
      <Example testedStyle={style} description="Default spring" />
      <Animated.View
        style={[
          { margin: 50, width: 50, height: 50, backgroundColor: 'teal' },
          rotationStyle,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = toggle
            ? LOWER_SPRING_TO_VALUE
            : UPPER_SPRING_TO_VALUE;
          rotation.value = toggle ? '380deg' : '-120deg';
          setToggle(!toggle);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    padding: CLAMP_MARKER_HEIGHT,
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
    height: 100,
    backgroundColor: VIOLET,
  },
  movingBox: {
    zIndex: 1,
    height: 100,
    opacity: 0.5,
    backgroundColor: 'black',
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
  },
});
