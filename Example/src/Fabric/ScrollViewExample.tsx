import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

import React from 'react';
import { Text } from 'react-native';

export default function ScrollViewExample() {
  const scrollHandler = useAnimatedScrollHandler((event) => {
    console.log(event.contentOffset.y);
  });

  return (
    <Animated.ScrollView
      scrollEventThrottle={16}
      onScroll={scrollHandler}
      style={{ flex: 1, width: '100%' }}>
      {[...Array(100)].map((x, i) => (
        <Text key={i} style={{ fontSize: 50, textAlign: 'center' }}>
          {i}
        </Text>
      ))}
    </Animated.ScrollView>
  );
}
