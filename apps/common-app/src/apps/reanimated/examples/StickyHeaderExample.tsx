import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const styles = StyleSheet.create({
  stickyHeader: {
    height: 80,
    backgroundColor: 'navy',
  },
  listItem: {
    padding: 16,
  },
});

export default function StickyHeaderExample() {
  const offset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
  });

  const animatedStyle = useAnimatedStyle(() => {
    return { transform: [{ translateY: offset.value }] };
  });

  return (
    <Animated.ScrollView onScroll={scrollHandler}>
      <Animated.View style={[styles.stickyHeader, animatedStyle]} />
      {Array.from({ length: 100 }).map((_, i) => (
        <Text key={i} style={styles.listItem}>
          Item {i + 1}
        </Text>
      ))}
    </Animated.ScrollView>
  );
}
