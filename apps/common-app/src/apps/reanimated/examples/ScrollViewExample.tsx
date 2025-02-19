import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';

export default function ScrollViewExample() {
  const scrollHandler = useAnimatedScrollHandler((event) => {
    console.log(_WORKLET, event.contentOffset.y);
  });

  return (
    <Animated.ScrollView onScroll={scrollHandler} style={styles.scrollView}>
      {[...Array(100)].map((_, i) => (
        <Text key={i} style={styles.text}>
          {i}
        </Text>
      ))}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  text: {
    fontSize: 50,
    textAlign: 'center',
  },
});
