import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withClamp,
} from 'react-native-reanimated';
import { View, Text, Button, StyleSheet, ViewStyle } from 'react-native';
import React, { useState } from 'react';

/**  TODO #5239 As soon as 'withClamp' is included in reanimated version used in docs
copy this example inside our documentation */

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 300;
const CLAMP_MARKER_HEIGHT = 40;

// Modify this values to change clamp limits
const LOWER_BOUND = 120;
const UPPER_BOUND = 220;

function renderExample(testedStyle: ViewStyle, description: string) {
  return (
    <>
      <Text style={styles.text}>{description}</Text>
      <View
        style={{
          width: FRAME_WIDTH + 2 * BORDER_WIDTH,
          borderWidth: BORDER_WIDTH,
          borderColor: VIOLET,
        }}>
        <Animated.View
          style={[
            styles.clampMarker,
            { marginBottom: -CLAMP_MARKER_HEIGHT, width: UPPER_BOUND },
          ]}
        />
        <Animated.View style={[styles.movingBox, testedStyle]} />
        <Animated.View
          style={[
            styles.clampMarker,
            {
              marginTop: -CLAMP_MARKER_HEIGHT,
              width: FRAME_WIDTH - LOWER_BOUND,
              alignSelf: 'flex-end',
            },
          ]}
        />
      </View>
    </>
  );
}

export default function AnimatedStyleUpdateExample() {
  const randomWidth = useSharedValue(100);
  const [toggle, setToggle] = useState(false);

  const config = {
    duration: 25000,
    dampingRatio: 0.075,
  };

  const clampedStyle = useAnimatedStyle(() => {
    return {
      width: withClamp(
        { min: LOWER_BOUND, max: UPPER_BOUND },
        withSpring(randomWidth.value, config)
      ),
    };
  });
  const style = useAnimatedStyle(() => {
    return {
      width: withSpring(randomWidth.value, config),
    };
  });

  return (
    <View style={styles.container}>
      {renderExample(clampedStyle, 'Clamped spring example')}

      {renderExample(style, 'Default spring')}
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = toggle ? 150 : 200;
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
  clampMarker: {
    margin: 0,
    opacity: 0.5,
    height: CLAMP_MARKER_HEIGHT,
    backgroundColor: VIOLET,
  },
  movingBox: {
    height: 100,
    opacity: 0.5,
    backgroundColor: 'black',
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
  },
});
