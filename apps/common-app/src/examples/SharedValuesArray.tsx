import React, { useCallback, useEffect, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  withTiming,
  useSharedValues,
} from 'react-native-reanimated';
import { Button, Dimensions, StyleSheet, View } from 'react-native';

function getCount(): number {
  return Math.ceil(Math.random() * 28);
}

type BoxProps = {
  opacity: SharedValue<number>;
};

function Box({ opacity }: BoxProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={styles.boxWrapper} exiting={FadeOut}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </Animated.View>
  );
}

export default function SharedValuesArrayExample() {
  const [count, setCount] = useState(getCount);
  const [reset, setReset] = useState(false);

  const svs = useSharedValues(count, 0, reset);

  const animateRandomOpacity = useCallback(() => {
    svs.forEach((sv) => {
      sv.value = withTiming(Math.random(), { duration: 1000 });
    });
  }, [svs]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log('change count');
      setCount(getCount());
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    animateRandomOpacity();
    const interval = setInterval(animateRandomOpacity, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [animateRandomOpacity]);

  return (
    <>
      <Button
        title={`${reset ? 'Disable' : 'Enable'} reset`}
        onPress={() => setReset(!reset)}
      />
      <View style={styles.boxes}>
        {svs.map((sv, index) => (
          <Box key={index} opacity={sv} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  boxes: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  boxWrapper: {
    flexBasis: Dimensions.get('window').width / 4,
    padding: 5,
  },
  box: {
    aspectRatio: 1,
    backgroundColor: 'red',
    borderRadius: 10,
  },
});
