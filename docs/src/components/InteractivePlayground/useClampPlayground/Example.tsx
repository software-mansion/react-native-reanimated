import React from 'react';
import { Button, StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withClamp,
  withSpring,
} from 'react-native-reanimated';

const GRAY_NAVY = '#c1c6e5';

const SWM_VIOLET_DARKER = '#782aeb';
const SWM_VIOLET = '#782aeb';
const SWM_GREEN = '#3fc684'; //swm green dark 100
const SWM_YELLOW = '#ffd61e'; //swm yellow light

const BORDER_WIDTH = 4;
const FRAME_WIDTH = 400;
const CLAMP_MARKER_HEIGHT = 40;

const VIOLET_REC_BORDER = 3;

interface ClampPlaygroundOptions {
  lowerBound: number;
  upperBound: number;
  lowerSpringToValue: number;
  upperSpringToValue: number;
}

interface Props {
  options: ClampPlaygroundOptions;
}
export default function App({ options }): Props {
  const toggle = useSharedValue(false);
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
  const defaultStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(width.value, config),
    };
  });

  function renderExample(testedStyle, description, showClampMarkers) {
    return (
      <View>
        <Text style={styles.text}>{description}</Text>
        <View
          style={{
            width: FRAME_WIDTH + 2 * BORDER_WIDTH,
            borderWidth: BORDER_WIDTH,
            borderColor: GRAY_NAVY,
          }}>
          <View>
            <View
              style={[
                styles.toValueMarker,
                {
                  left: options.lowerSpringToValue - CLAMP_MARKER_HEIGHT / 4,
                },
              ]}
            />
            {showClampMarkers && (
              <View
                style={[
                  styles.clampMarker,
                  {
                    width: options.lowerBound,
                  },
                ]}
              />
            )}
          </View>
          <Animated.View style={[styles.movingBox, testedStyle]} />
          <View>
            <View
              style={[
                styles.toValueMarker,
                {
                  marginTop: -CLAMP_MARKER_HEIGHT / 2,
                  right:
                    FRAME_WIDTH -
                    options.upperSpringToValue -
                    CLAMP_MARKER_HEIGHT / 4,
                  alignSelf: 'flex-end',
                },
              ]}
            />
            {showClampMarkers && (
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
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderExample(clampedStyle, 'Clamped spring', true)}
      {renderExample(defaultStyle, 'Default spring', false)}
      <View style={styles.toggleButton}>
        <Button
          color={SWM_VIOLET_DARKER}
          title="toggle"
          onPress={() => {
            toggle.value = !toggle.value;
            width.value = toggle.value
              ? options.lowerSpringToValue + VIOLET_REC_BORDER / 2
              : options.upperSpringToValue + VIOLET_REC_BORDER / 2;
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: CLAMP_MARKER_HEIGHT,
    paddingBottom: 0,
  },
  toValueMarker: {
    position: 'absolute',
    margin: 0,
    opacity: 1,
    zIndex: 100,
    height: CLAMP_MARKER_HEIGHT / 2,
    width: CLAMP_MARKER_HEIGHT / 2,
    borderRadius: CLAMP_MARKER_HEIGHT,
    backgroundColor: SWM_YELLOW,
  },
  clampMarker: {
    position: 'absolute',
    margin: 0,
    opacity: 0.5,
    height: 100,
    backgroundColor: SWM_GREEN,
  },
  movingBox: {
    zIndex: 1,
    height: 100,
    opacity: 1,
    borderColor: SWM_VIOLET,
    borderWidth: VIOLET_REC_BORDER,
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
    color: '#919fcf',
  },
  toggleButton: {
    marginVertical: 20,
  },
});
