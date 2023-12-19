import { Text, StyleSheet, View, Button } from 'react-native';

import React, { useEffect } from 'react';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

function createRandomArray(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 2));
}

const N = 200;

function useLoop() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 1000, easing: Easing.linear }),
      -1,
      true
    );
  }, [sv]);

  return sv;
}

interface ItemProps {
  index: number;
  sv: SharedValue<number>;
}

function Item({ index, sv }: ItemProps) {
  const backgroundColor = `hsl(${(index / N) * 300}, 100%, 50%)`;

  const animatedStyle = useAnimatedStyle(() => {
    return { width: 120 + Math.cos(sv.value) * 100 };
  });

  return (
    <Animated.View style={[styles.bar, { backgroundColor }, animatedStyle]}>
      <Text>{index}</Text>
    </Animated.View>
  );
}

export default function RainbowExample() {
  const sv = useLoop();

  const [array, setArray] = React.useState(createRandomArray(N));

  const handlePress = () => {
    setArray(createRandomArray(N));
  };

  return (
    <View style={styles.container}>
      <Button title="Press me" onPress={handlePress} />
      <View style={styles.wrapper}>
        {array.map((value, index) =>
          value ? <Item index={index} sv={sv} key={index} /> : null
        )}
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
  wrapper: {
    backgroundColor: 'black',
    width: '100%',
    flex: 1,
  },
  bar: {
    height: 5,
  },
});
