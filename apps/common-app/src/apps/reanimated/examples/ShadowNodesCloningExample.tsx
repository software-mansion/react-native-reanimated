import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';

function AnimatedView() {
  const opacitySv = useSharedValue(0);
  const scaleSv = useSharedValue(0);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      opacitySv.value = withTiming(Math.random(), { duration: 300 });
      scaleSv.value = withTiming(Math.random() * 2, { duration: 300 });
      setCounter((prevCounter) => prevCounter + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [opacitySv, scaleSv, setCounter]);

  const style = [
    styles.animatedView,
    {
      opacity: opacitySv,
      transform: [{ scale: scaleSv }],
    },
  ];

  return (
    <Animated.View collapsable={false} style={style}>
      <Text>{counter}</Text>
    </Animated.View>
  );
}

function RecursiveView(props: { depth: number; noExtraChildren: number }) {
  const childrenArr = useMemo(
    () => Array.from({ length: props.noExtraChildren }),
    [props.noExtraChildren]
  );

  if (props.depth === 0) {
    return <AnimatedView />;
  }

  return (
    <View collapsable={false}>
      <RecursiveView
        depth={props.depth - 1}
        noExtraChildren={props.noExtraChildren}
      />
      {childrenArr.map((_, idx) => (
        <View collapsable={false} key={idx} />
      ))}
    </View>
  );
}

export default function ShadowNodesCloningExample() {
  return (
    <View style={styles.container}>
      <RecursiveView depth={100} noExtraChildren={100} />
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
