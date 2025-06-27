import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  WithTimingConfig,
  cancelAnimation,
  useReducedMotion,
  ReduceMotion,
} from 'react-native-reanimated';

const initialOffset = -200;

interface Props {
  width: number;
  options: WithTimingConfig;
}

export default function App({ width, options }: Props) {
  const offset = useSharedValue(initialOffset);
  const reduceMotion = useReducedMotion();
  const shouldReduceMotion =
    options.reduceMotion === ReduceMotion.Always ||
    (options.reduceMotion === ReduceMotion.System && reduceMotion);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const callback = (isFinished) => {
    setTimeout(
      () => {
        if (isFinished) {
          offset.value = initialOffset;
          setButtonDisabled(false);
        }
      },
      shouldReduceMotion ? 1000 : options.duration
    );
  };

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: (offset.value / 400) * (width - 480) }],
    };
  });

  useEffect(() => {
    cancelAnimation(offset);
    offset.value = initialOffset;
  }, [options]);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const id = setInterval(() => {
      offset.value = withTiming(-initialOffset, options, callback);
    }, options.duration);

    return () => clearInterval(id);
  }, [options, shouldReduceMotion]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyles]}> </Animated.View>
      <View
        style={[
          styles.box,
          styles.ghost,
          {
            transform: [{ translateX: (initialOffset / 400) * (width - 480) }],
          },
        ]}
      />
      {shouldReduceMotion && (
        <Button
          disabled={buttonDisabled}
          title="start"
          onPress={() => {
            setButtonDisabled(true);
            offset.value = withTiming(-initialOffset, options, callback);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 64,
    marginBottom: 34,
  },
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    marginBottom: 30,
  },
  ghost: {
    opacity: 0.3,
    position: 'absolute',
  },
});
