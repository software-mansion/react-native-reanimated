import React from 'react';

import Animated, {
  useScrollViewOffset,
  useAnimatedRef,
  withTiming,
  useAnimatedReaction,
  scrollTo,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function ScrollViewOffsetCallScrollToExample() {
  const aref = useAnimatedRef<Animated.ScrollView>();
  const aref2 = useAnimatedRef<Animated.ScrollView>();
  const scrollHandler = useScrollViewOffset(aref);
  const scrollHandler2 = useScrollViewOffset(aref2);

  const onChangeScrollValue = () => {
    scrollHandler.value = Math.random() * 5000;
  };

  const onAnimatedChangeScrollValue = () => {
    scrollHandler.value = withTiming(Math.random() * 5000);
  };

  useAnimatedReaction(
    () => {
      return scrollHandler.value;
    },
    (value) => {
      scrollTo(aref2, 0, value, false);
    }
  );

  useAnimatedStyle(() => {
    console.log(scrollHandler.value);
    console.log(scrollHandler2.value);
    return {};
  });

  return (
    <>
      <View style={styles.positionView}>
        <Text>Test</Text>
        <Button
          title="Scroll without animation"
          onPress={onChangeScrollValue}
        />
        <Button
          title="Scroll with animation"
          onPress={onAnimatedChangeScrollValue}
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.scrollsContainer}>
        <Animated.ScrollView ref={aref} style={styles.scrollView}>
          {[...Array(100)].map((_, i) => (
            <Text key={i} style={styles.text}>
              {i}
            </Text>
          ))}
        </Animated.ScrollView>
        <Animated.ScrollView ref={aref2} style={styles.scrollView}>
          {[...Array(100)].map((_, i) => (
            <Text key={i} style={styles.text}>
              {i}
            </Text>
          ))}
        </Animated.ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  positionView: {
    margin: 20,
    alignItems: 'center',
  },
  scrollsContainer: {
    flexDirection: 'row',
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
