import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const INITIAL_OFFSET = 110;
const SIZE = 160;
const MARGIN = 30;
const LEFT_BOUNDARY = 330;
const RIGHT_BOUNDARY = -330;

const items = [
  { color: '#FFE780' },
  { color: '#87CCE8' },
  { color: '#FFA3A1' },
  { color: '#B1DFD0' },
];

export default function App() {
  const offset = useSharedValue(INITIAL_OFFSET);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const advanceBy = (position) => {
    const previousOffset = offset.value;
    if (
      (previousOffset < LEFT_BOUNDARY && position === -1) ||
      (previousOffset > RIGHT_BOUNDARY && position === 1)
    ) {
      const newOffset = offset.value + (SIZE + 2 * MARGIN) * -position;
      // highlight-start
      offset.value = withSpring(newOffset, {
        restDisplacementThreshold: 5,
        restSpeedThreshold: 5,
      });
      // highlight-end
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        <Pressable
          style={[styles.button, styles.previous]}
          onPress={() => advanceBy(-1)}>
          <Text style={styles.buttonItem}>{'<'}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.next]}
          onPress={() => advanceBy(1)}>
          <Text style={styles.buttonItem}>{'>'}</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.row, animatedStyles]}>
        {items.map((item) => (
          <View
            key={item.color}
            style={{ ...styles.box, backgroundColor: item.color }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    marginVertical: 64,
    overflow: 'hidden',
  },
  buttonWrapper: {
    position: 'absolute',
    width: SIZE,
    zIndex: 1,
  },
  box: {
    height: SIZE,
    width: SIZE,
    borderRadius: 5,
    marginHorizontal: MARGIN,
  },
  row: {
    flexDirection: 'row',
  },
  button: {
    position: 'absolute',
    width: SIZE / 3,
    height: SIZE / 3,
    borderRadius: SIZE,
    backgroundColor: '#ccc',
    borderColor: '#fff',
    borderWidth: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    top: 58,
  },
  buttonItem: {
    color: '#666',
    fontSize: 30,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingBottom: 2,
  },
  previous: {
    left: -30,
  },
  next: {
    right: -30,
  },
});
