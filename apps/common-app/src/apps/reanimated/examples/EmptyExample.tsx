import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

function Counter() {
  const [a, setA] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setA((a) => a + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  console.log('AnimatedTextExample render', a);

  return <Text>Count: {a}</Text>;
}

export default function EmptyExample() {
  const sv = useSharedValue(0);

  const textSv = useDerivedValue(() => {
    return String(Math.round(sv.value));
  });

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(100, { duration: 1000 }), -1, true);
  }, [sv]);

  const [a, setA] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setA((a) => a + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // const animatedProps = useAnimatedProps(() => {
  //   return {
  //     text: textSv.value,
  //   };
  // });

  return (
    <View style={styles.container}>
      {/* <Counter /> */}
      <Animated.Text
        // animatedProps={animatedProps}
        text={textSv}
        style={{
          fontVariant: ['tabular-nums'],
          fontSize: 40,
          backgroundColor: 'lightblue',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
