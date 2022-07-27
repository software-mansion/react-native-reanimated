import React from 'react';

import Animated, {
  useScrollViewPosition,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

export default function ScrollViewPositionExample() {
  const scrollViewPosition = useSharedValue(0);
  const scrollHandler = useScrollViewPosition(scrollViewPosition);

  useAnimatedStyle(() => {
    console.log(scrollViewPosition);
    return {};
  });

  return (
    <>
      <View style={styles.positionView}>
        <Text>Test</Text>
      </View>
      <View style={styles.divider} />
      <Animated.ScrollView onScroll={scrollHandler} style={styles.scrollView}>
        {[...Array(100)].map((_, i) => (
          <Text key={i} style={styles.text}>
            {i}
          </Text>
        ))}
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  positionView: {
    margin: 20,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  text: {
    fontSize: 50,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: 'black',
    height: 1,
  },
});
