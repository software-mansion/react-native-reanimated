import React from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { View, Text, Button, StyleSheet, ViewStyle } from 'react-native';

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 300;
const LOWER_CLAMP = 120;
const UPPER_CLAMP = 220;
const CLAMP_MARKER_HEIGHT = 40;

function renderFramedExample(testedStyle: ViewStyle, description: string) {
  return (
    <React.Fragment>
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
            { marginBottom: -CLAMP_MARKER_HEIGHT, width: UPPER_CLAMP },
          ]}
        />
        <Animated.View style={[styles.movingBox, testedStyle]} />
        <Animated.View
          style={[
            styles.clampMarker,
            {
              marginTop: -CLAMP_MARKER_HEIGHT,
              width: FRAME_WIDTH - LOWER_CLAMP,
              alignSelf: 'flex-end',
            },
          ]}
        />
      </View>
    </React.Fragment>
  );
}

export default function AnimatedStyleUpdateExample() {
  const randomWidth = useSharedValue(130);

  const config = {
    duration: 5000,
    dampingRatio: 0.4,
  };

  const clampedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(randomWidth.value, {
        ...config,
        clamp: [LOWER_CLAMP, UPPER_CLAMP],
      }),
    };
  });

  const style = useAnimatedStyle(() => {
    return {
      width: withSpring(randomWidth.value, config),
    };
  });

  return (
    <View style={styles.container}>
      {renderFramedExample(clampedStyle, 'Clamp example')}
      {renderFramedExample(style, 'Default')}
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = randomWidth.value === 210 ? 130 : 210;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    padding: 40,
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
