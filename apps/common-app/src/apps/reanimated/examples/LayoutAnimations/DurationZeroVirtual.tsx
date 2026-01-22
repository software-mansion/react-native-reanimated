import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  withTiming,
  type LayoutAnimationFunction,
} from 'react-native-reanimated';

type Box = { id: number; color: string; y: number };

const INITIAL_DATA: Box[] = [...new Array<number>(6)].map((_, index) => ({
  id: index,
  color: `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
  y: 20 + index * 100,
}));

const customLayout: LayoutAnimationFunction = (values) => {
  'worklet';
  return {
    initialValues: { originY: values.currentOriginY },
    animations: { originY: withTiming(values.targetOriginY, { duration: 0 }) },
  };
};

export default function DurationZeroVirtualization() {
  const [data, setData] = React.useState<Box[]>(INITIAL_DATA);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setData((data) =>
      data.map((box) => ({
        ...box,
        y:
          offsetY > box.y
            ? box.y + data.length * 100
            : box.y - data.length * 100 > offsetY
              ? box.y - data.length * 100
              : box.y,
      }))
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.contentContainer}
      onScroll={onScroll}
      scrollEventThrottle={16}>
      {data.map((box) => (
        <Animated.View
          layout={customLayout}
          key={box.id}
          style={[styles.content, { backgroundColor: box.color, top: box.y }]}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 8,
    height: 10000,
  },
  content: {
    position: 'absolute',
    left: '15%',
    width: '70%',
    height: 80,
    borderRadius: 10,
  },
});
