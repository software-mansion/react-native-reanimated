import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FrameInfo,
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
          throw new Error('Negative time since previous frame detected');
        }
      },
      [frameInfoSharedValue]
    )
  );

  const [frameInfo, setFrameInfo] = React.useState<FrameInfo | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setFrameInfo(frameInfoSharedValue.value);
    }, 0);
    return () => clearInterval(id);
  }, [frameInfoSharedValue]);

  return (
    <View style={styles.container}>
      <Text>
        Timestamp:{' '}
        <Text style={styles.number}>{frameInfo?.timestamp.toFixed(6)}</Text>
      </Text>
      <Text>
        Time since first frame:{' '}
        <Text style={styles.number}>
          {frameInfo?.timeSinceFirstFrame.toFixed(6)}
        </Text>
      </Text>
      <Text>
        Time since previous frame:{' '}
        <Text style={styles.number}>
          {frameInfo !== null && frameInfo.timeSincePreviousFrame !== null
            ? frameInfo.timeSincePreviousFrame.toFixed(6)
            : 'null'}
        </Text>
      </Text>
      <Text>
        Frames per second:{' '}
        <Text style={styles.number}>
          {frameInfo !== null && frameInfo.timeSincePreviousFrame !== null
            ? (1000 / frameInfo.timeSincePreviousFrame).toFixed(2)
            : 'unknown'}
        </Text>
      </Text>
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
  },
});
