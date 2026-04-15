import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

function AnimatedView() {
  const opacitySv = useSharedValue(0);
  const scaleSv = useSharedValue(0);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    opacitySv.value = withRepeat(
      withTiming(Math.random(), { duration: 600 }),
      -1,
      true
    );
    scaleSv.value = withRepeat(
      withTiming(Math.random() * 3, { duration: 600 }),
      -1,
      true
    );

    const interval = setInterval(() => {
      setCounter((prevCounter) => prevCounter + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [opacitySv, scaleSv, setCounter]);

  const style = useMemo(
    () => [
      styles.animatedView,
      {
        opacity: opacitySv,
        transform: [{ scale: scaleSv }],
      },
    ],
    [opacitySv, scaleSv]
  );

  return (
    <Animated.View collapsable={false} style={style}>
      <Text>{counter}</Text>
    </Animated.View>
  );
}

function RecursiveView(props: { depth: number; extraChildrenCount: number }) {
  const children = useMemo(
    () =>
      Array.from({ length: props.extraChildrenCount }, (_, idx) => (
        <View collapsable={false} key={idx} />
      )),
    [props.extraChildrenCount]
  );

  if (props.depth === 0) {
    return <AnimatedView />;
  }

  return (
    <View collapsable={false}>
      <RecursiveView
        depth={props.depth - 1}
        extraChildrenCount={props.extraChildrenCount}
      />
      {children}
    </View>
  );
}

export default function ShadowNodesCloningExample() {
  return (
    <View style={styles.container}>
      <RecursiveView depth={100} extraChildrenCount={100} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedView: {
    width: 32,
    height: 32,
    backgroundColor: 'red',
  },
});
