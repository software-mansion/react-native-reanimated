import Animated, {
  useAnimatedStyle,
  SlideInDown,
  ZoomOut,
  useDerivedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import React, { useEffect, useState } from 'react';

interface Item {
  color: string;
}

function getRandomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

const Entering = SlideInDown.springify().mass(1).stiffness(1000).damping(500);
const Exiting = ZoomOut.springify().mass(1).stiffness(1000).damping(500);

function ItemComponent({ item, index }: { item: Item; index: number }) {
  const rotation = useDerivedValue(() => withSpring(index * 15), [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      zIndex: -index,
      backgroundColor: item.color,
      transform: [
        {
          translateX: interpolate(rotation.value, [0, 100], [0, 100]),
        },
        {
          translateY: interpolate(rotation.value, [0, 100], [0, -30]),
        },
        {
          scale: interpolate(rotation.value, [0, 100], [1, 0.7]),
        },
        {
          rotate: `${rotation.value}deg`,
        },
      ],
    };
  }, [rotation, index, item]);

  return (
    <Animated.View
      entering={Entering}
      exiting={Exiting}
      style={[styles.item, animatedStyle]}
    />
  );
}

export default function StackedLayoutAnimationExample() {
  const [items, setItems] = useState<Item[]>([
    { color: 'red' },
    { color: 'green' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((i) => [{ color: getRandomColor() }, ...i]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        if (index > 2) {
          return null;
        }
        return <ItemComponent key={item.color} item={item} index={index} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    width: 100,
    height: 150,
    borderRadius: 15,
    position: 'absolute',
  },
});
