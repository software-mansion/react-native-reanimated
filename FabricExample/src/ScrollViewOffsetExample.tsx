import React from 'react';

import Animated, {
  useScrollViewOffset,
  useAnimatedStyle,
  useAnimatedRef,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

export default function ScrollViewOffsetExample() {
  const aref = useAnimatedRef<Animated.ScrollView>();
  const scrollHandler = useScrollViewOffset(aref);

  useAnimatedStyle(() => {
    console.log(scrollHandler.value);
    return {};
  });

  return (
    <>
      <View style={styles.positionView}>
        <Text>Test</Text>
      </View>
      <View style={styles.divider} />
      <Animated.ScrollView
        ref={aref}
        scrollEventThrottle={16}
        style={styles.scrollView}>
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
