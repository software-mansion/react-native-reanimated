import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FrameInfo,
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

export default function FpsExample() {
  const frameInfoSharedValue = useSharedValue<FrameInfo | null>(null);

  useFrameCallback(
    useCallback(
      (frameInfo) => {
        'worklet';
        frameInfoSharedValue.value = frameInfo;
        if (
          frameInfo.timeSincePreviousFrame !== null &&
          frameInfo.timeSincePreviousFrame < 0
        ) {
          throw new Error('Negative `timeSincePreviousFrame` detected');
        }
      },
      [frameInfoSharedValue]
    )
  );

  const timestampAnimatedProps = useAnimatedProps(() => {
    return {
      text: String(frameInfoSharedValue.value?.timestamp.toFixed(6)),
    };
  });

  const timeSinceFirstFrameAnimatedProps = useAnimatedProps(() => {
    return {
      text: String(frameInfoSharedValue.value?.timeSinceFirstFrame.toFixed(6)),
    };
  });

  const timeSincePreviousFrameAnimatedProps = useAnimatedProps(() => {
    const frameInfo = frameInfoSharedValue.value;
    return {
      text:
        frameInfo !== null && frameInfo.timeSincePreviousFrame !== null
          ? String(frameInfo.timeSincePreviousFrame.toFixed(6))
          : 'null',
    };
  });

  const framesPerSecondAnimatedProps = useAnimatedProps(() => {
    const frameInfo = frameInfoSharedValue.value;
    return {
      text:
        frameInfo !== null && frameInfo.timeSincePreviousFrame !== null
          ? String((1000 / frameInfo.timeSincePreviousFrame).toFixed(2))
          : 'unknown',
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text>Timestamp:</Text>
        <Animated.Text
          animatedProps={timestampAnimatedProps}
          style={styles.number}
        />
      </View>
      <View style={styles.row}>
        <Text>Time since first frame:</Text>
        <Animated.Text
          animatedProps={timeSinceFirstFrameAnimatedProps}
          style={styles.number}
        />
      </View>
      <View style={styles.row}>
        <Text>Time since previous frame:</Text>
        <Animated.Text
          animatedProps={timeSincePreviousFrameAnimatedProps}
          style={styles.number}
        />
      </View>
      <View style={styles.row}>
        <Text>Frames per second:</Text>
        <Animated.Text
          animatedProps={framesPerSecondAnimatedProps}
          style={styles.number}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
