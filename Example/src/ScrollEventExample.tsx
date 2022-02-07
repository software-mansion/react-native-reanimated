import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useHeaderHeight } from '@react-navigation/stack';

const size = 40;

function ScrollExample(): React.ReactElement {
  const transY = useSharedValue(0);
  const isScrolling = useSharedValue(false);
  const headerHeight = useHeaderHeight();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      transY.value = event.contentOffset.y;
    },
    onBeginDrag: () => {
      isScrolling.value = true;
    },
    onEndDrag: () => {
      isScrolling.value = false;
    },
  });

  const stylez = useAnimatedStyle(() => {
    const size = isScrolling.value ? 80 : 40;
    return {
      transform: [
        {
          translateY: transY.value,
        },
      ],
      width: withSpring(size),
      height: withSpring(size),
    };
  });

  const windowHeight = Dimensions.get('window').height - headerHeight;
  const height = Platform.OS === 'web' ? windowHeight : undefined;

  return (
    <View style={styles.container}>
      <View style={[styles.half, { height }]}>
        <Animated.View style={[styles.box, stylez]} />
      </View>
      <View style={[styles.half, { height }]}>
        <Animated.ScrollView
          style={styles.scroll}
          scrollEventThrottle={1}
          onScroll={scrollHandler}>
          <View style={styles.placeholder} />
          <View style={styles.placeholder} />
          <View style={styles.placeholder} />
          <View style={styles.placeholder} />
          <View style={styles.placeholder} />
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  half: {
    flex: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'yellow',
  },
  box: {
    alignSelf: 'center',
    backgroundColor: 'black',
  },
  placeholder: {
    width: size,
    height: size,
    backgroundColor: 'brown',
    marginVertical: 300,
  },
});

export default ScrollExample;
