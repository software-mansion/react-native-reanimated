import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withClamp,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const BOX_START = 0;
const BOX_STOP = 200;
const BOX_SIZE = 80;

const FRAME_WIDTH = 400;
const FRAME_HEIGHT = 100;
const CLAMP_MARKER_HEIGHT = 40;

interface ClampPlaygroundOptions {
  lowerBound: number;
  upperBound: number;
}

interface Props {
  options: ClampPlaygroundOptions;
}
export default function App({ options }: Props) {
  const config = {
    damping: 3,
  };

  const clampedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withClamp(
            { min: options.lowerBound, max: options.upperBound },
            withRepeat(
              withSequence(
                withDelay(2000, withSpring(BOX_STOP, config)),
                withTiming(BOX_START, { duration: 0 })
              ),
              -1,
              true
            )
          ),
        },
      ],
    };
  });
  const defaultStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withRepeat(
            withSequence(
              withDelay(2000, withSpring(200, config)),
              withTiming(0, { duration: 0 })
            ),
            -1,
            true
          ),
        },
      ],
    };
  });

  function Example({
    testedStyle,
    description,
    showClampMarkers,
  }: {
    testedStyle: ViewStyle;
    description: string;
    showClampMarkers: boolean;
  }) {
    return (
      <View
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
        }}>
        <View>
          {showClampMarkers && (
            <View
              style={[
                styles.clampMarker,
                {
                  marginTop: (BOX_SIZE - FRAME_HEIGHT) / 2,
                  borderRightWidth: 2,
                  width: options.lowerBound,
                },
              ]}
            />
          )}
        </View>
        <Animated.View style={[styles.movingBox, testedStyle]}>
          <Text style={styles.text}>{description}</Text>
        </Animated.View>
        <View>
          {showClampMarkers && (
            <View
              style={[
                styles.clampMarker,
                {
                  borderLeftWidth: 2,
                  marginTop: -(BOX_SIZE + FRAME_HEIGHT) / 2,
                  width: FRAME_WIDTH - options.upperBound - BOX_SIZE,
                  alignSelf: 'flex-end',
                },
              ]}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Example
        testedStyle={clampedStyle}
        description="Clamped spring"
        showClampMarkers={true}
      />
      <Example
        testedStyle={defaultStyle}
        description="Default spring"
        showClampMarkers={false}
      />
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
  clampMarker: {
    position: 'absolute',
    margin: 0,
    opacity: 0.5,
    height: 100,
    borderColor: '#b58df1',
    borderStyle: 'dashed',
  },
  movingBox: {
    height: BOX_SIZE,
    width: BOX_SIZE,
    borderColor: '#b58df1',
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#b58df1',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
