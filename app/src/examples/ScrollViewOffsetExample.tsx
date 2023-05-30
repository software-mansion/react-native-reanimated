import React from 'react';

import Animated, {
  useAnimatedRef,
  withTiming,
  useAnimatedReaction,
  scrollTo,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function ScrollViewOffsetCallScrollToExample() {
  const aref = useAnimatedRef<Animated.ScrollView>();
  const scrollHandler = useSharedValue(0);
  const scrollHandler2 = useSharedValue(0);

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
      scrollTo(aref, 0, value, false);
    }
  );

  useAnimatedStyle(() => {
    console.log(scrollHandler.value);
    console.log(scrollHandler2.value);
    return {};
  });

  const onButtonPress = () => {
    aref.current?.scrollTo({
      y: Math.random() * 2000,
      animated: true,
    });
  };

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
        <Animated.ScrollView
          scrollViewOffset={scrollHandler}
          style={styles.scrollView}>
          {[...Array(100)].map((_, i) => (
            <Text key={i} style={styles.text}>
              {i}
            </Text>
          ))}
        </Animated.ScrollView>
        <Animated.ScrollView
          scrollViewOffset={scrollHandler2}
          ref={aref}
          style={styles.scrollView}>
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
