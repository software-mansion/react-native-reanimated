import { StyleSheet, View } from 'react-native';

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const ROWS = 23;
const COLS = 12;

function getRandomColor() {
  return `hsl(${Math.random() * 360}, 100%, 50%)`;
}

interface BubbleProps {
  row: number;
  col: number;
}

function Bubble({ row, col }: BubbleProps) {
  const backgroundColor = React.useRef(getRandomColor()).current;

  const width = useSharedValue(0);

  React.useEffect(() => {
    const delay = 100 + Math.random() * 1000;
    width.value = withDelay(delay, withSpring(42, { damping: 1e6 }));
  }, [width, row, col]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
      height: width.value,
      borderRadius: width.value / 2,
    };
  }, []);

  return <Animated.View style={[{ backgroundColor }, animatedStyle]} />;
}

interface BubbleRowProps {
  row: number;
}

function BubbleRow({ row }: BubbleRowProps) {
  return (
    <View style={[styles.row, { paddingLeft: 40 * (row % 2) }]}>
      {[...Array(COLS)].map((_, col) => (
        <Bubble row={row} col={col} key={col} />
      ))}
    </View>
  );
}

export default function BubblesExample() {
  return (
    <View style={styles.container}>
      {[...Array(ROWS)].map((_, i) => (
        <BubbleRow row={i} key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -5,
  },
});
