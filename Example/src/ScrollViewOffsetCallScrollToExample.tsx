import React, { useState } from 'react';

import Animated, {
  useScrollViewOffset,
  useAnimatedRef,
  withTiming,
} from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function ScrollViewOffsetCallScrollToExample() {
  const aref = useAnimatedRef<Animated.ScrollView>();
  const scrollHandler = useScrollViewOffset(aref);
  const [horizontal, setHorizontal] = useState(false);

  const onChangeScrollValue = () => {
    scrollHandler.value = Math.random() * 5000;
  };

  const onAnimatedChangeScrollValue = () => {
    scrollHandler.value = withTiming(Math.random() * 5000);
  };

  return (
    <>
      <View style={styles.positionView}>
        <Text>Test</Text>
        <Button
          title="Horizontal/Vertical"
          onPress={() => setHorizontal(!horizontal)}
        />
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
      <Animated.ScrollView
        ref={aref}
        scrollEventThrottle={16}
        style={styles.scrollView}
        horizontal={horizontal}>
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
