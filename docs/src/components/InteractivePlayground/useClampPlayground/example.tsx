import React from 'react';
import { Button, StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withClamp,
  withSpring,
} from 'react-native-reanimated';

const VIOLET = '#b58df1';
const BORDER_WIDTH = 4;
const FRAME_WIDTH = 300;
const CLAMP_MARKER_HEIGHT = 40;

interface ClampPlaygroundOptions {
  lowerBound: number;
  upperBound: number;
  lowerSpringToValue: number;
  upperSpringToValue: number;
}

interface Props {
  options: ClampPlaygroundOptions;
}
export default function useClampPlayground({ options }): Props {
  const width = useSharedValue(100);

  const config = {
    duration: 25000,
    dampingRatio: 0.075,
  };

  const clampedStyle = useAnimatedStyle(() => {
    return {
      width: withClamp(
        { min: options.lowerBound, max: options.upperBound },
        withSpring(width.value, config)
      ),
    };
  });

  function renderExample(testedStyle, description) {
    return (
      <View>
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
                  width: options.lowerSpringToValue,
                },
              ]}
            />
            <View
              style={[
                styles.clampMarker,
                {
                  width: options.lowerBound,
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
                  width: FRAME_WIDTH - options.upperSpringToValue,
                  alignSelf: 'flex-end',
                },
              ]}
            />
            <View
              style={[
                styles.clampMarker,
                {
                  marginTop: -100,
                  width: FRAME_WIDTH - options.upperBound,
                  alignSelf: 'flex-end',
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderExample(clampedStyle, 'Clamped spring')}

      <Button
        title="toggle"
        onPress={() => {
          width.value =
            width.value === options.upperSpringToValue
              ? options.lowerSpringToValue
              : options.upperSpringToValue;
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
