import React, { useCallback, useEffect, useState } from 'react';
import { Button, Dimensions, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValuesObject,
  useSharedValuesObjects,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

function getCount() {
  return Math.ceil(Math.random() * 32);
}

function getRandomPosition() {
  const width = Dimensions.get('window').width - 20;
  const height = Dimensions.get('window').height - 120;
  return { x: Math.random() * width, y: Math.random() * height };
}

type DotProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  color: string;
  opacity: SharedValue<number>;
};

function updatePosition(svo: DotProps) {
  const { x, y } = getRandomPosition();
  svo.x.value = withTiming(x, { duration: 1000 });
  svo.y.value = withTiming(y, { duration: 1000 });
}

function Dot({ x, y, color, opacity }: DotProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { translateY: 0 },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <Animated.View
        style={[styles.dot, { backgroundColor: color }, animatedStyle]}
      />
    </Animated.View>
  );
}

function SingleShareValuesObjectExample() {
  const [counter, setCounter] = useState(0);

  const svo = useSharedValuesObject(
    ({ mutable }) => {
      const { x, y } = getRandomPosition();
      return {
        x: mutable(x),
        y: mutable(y),
        opacity: mutable(1),
        color: getRandomColor(),
      };
    },
    [counter]
  );

  useEffect(() => {
    svo.opacity.value = withRepeat(
      withSequence(withTiming(1), withTiming(0.5)),
      -1,
      true
    );

    updatePosition(svo);
    const interval = setInterval(() => updatePosition(svo), 1000);

    return () => clearInterval(interval);
  }, [svo]);

  return (
    <>
      <Button
        title="Re-create object"
        onPress={() => setCounter((c) => c + 1)}
      />
      <Dot {...svo} />
    </>
  );
}

function ArrayOfSharedValueObjectsExample() {
  const [count, setCount] = useState(getCount);
  const [reset, setReset] = useState(false);

  const svoArray = useSharedValuesObjects(
    count,
    ({ mutable, index }) => {
      const { x, y } = getRandomPosition();
      return {
        x: mutable(x),
        y: mutable(y),
        opacity: mutable(index / count),
        color: getRandomColor(),
      };
    },
    reset ? [count] : []
  );

  const updatePositions = useCallback(() => {
    svoArray.forEach(updatePosition);
  }, [svoArray]);

  const animateRandomOpacity = useCallback(() => {
    svoArray.forEach(({ opacity }) => {
      opacity.value = withTiming(Math.random(), { duration: 1000 });
    });
  }, [svoArray]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(getCount());
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    svoArray.forEach((svo) => {
      svo.opacity.value = withRepeat(
        withSequence(withTiming(1), withTiming(0.5)),
        -1,
        true
      );
    });

    updatePositions();
    const interval = setInterval(() => {
      updatePositions();
      animateRandomOpacity();
    }, 1000);

    return () => clearInterval(interval);
  }, [svoArray, updatePositions, animateRandomOpacity]);

  return (
    <>
      <Button
        title={`${reset ? 'Disable' : 'Enable'} reset`}
        onPress={() => setReset(!reset)}
      />
      {svoArray.map((svo, index) => (
        <Dot key={index} {...svo} />
      ))}
    </>
  );
}

export default function SharedValuesObjectExample() {
  const [showMultiple, setShowMultiple] = useState(false);

  return (
    <View style={styles.container}>
      <Button
        title={`${showMultiple ? 'Show single' : 'Show multiple'}`}
        onPress={() => setShowMultiple((s) => !s)}
      />
      {showMultiple ? (
        <ArrayOfSharedValueObjectsExample />
      ) : (
        <SingleShareValuesObjectExample />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
