import * as React from 'react';
import { View, StyleSheet, Platform, Button } from 'react-native';
import Animated, {
  useDerivedValue,
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  useAnimatedScrollHandler,
  Extrapolate,
  executeMappers,
} from 'react-native-reanimated';

export default function Repro() {
  const scroll = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler(({ contentOffset: { y } }) => {
    scroll.value = y;
  });

  const translationY = useDerivedValue(() => {
    const startScroll = Platform.OS === 'ios' ? -200 : 0;
    const endScroll = Platform.OS === 'ios' ? 0 : 200;

    return interpolate(
      scroll.value,
      [startScroll, endScroll],
      [0, -200],
      Extrapolate.CLAMP
    );
  }, [scroll]);

  const animatedHeaderStyle = useAnimatedStyle(() => {
    /**
     * On mount you will see this log
     * : -200 0
     * : 0 -200
     * iPhone 12: 0 -200
     * iPhone 12: -200 0
     *
     * It seems at times the final -200 0 is not applied to the style
     */

    return {
      position: 'absolute',
      backgroundColor: 'red',
      height: 200,
      top: 0,
      left: 0,
      right: 0,
      paddingTop: 100,
      transform: [
        {
          translateY: translationY.value,
        },
      ],
    };
  }, [translationY]);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentInset={{ top: 200 }}
        contentOffset={{
          y: -200,
          x: 0,
        }}
        contentContainerStyle={styles.contentContainer}
        style={styles.container}
        onScroll={scrollHandler}
        scrollEventThrottle={16}>
        <View style={styles.blueSpace} />
      </Animated.ScrollView>
      <Animated.View style={animatedHeaderStyle}>
        <View style={styles.middleLine} />
      </Animated.View>
      <Button title="start mapper" onPress={() => executeMappers()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Platform.OS === 'android' ? 200 : undefined,
  },
  blueSpace: {
    height: 500,
    backgroundColor: 'blue',
  },
  middleLine: {
    height: 10,
    backgroundColor: 'green',
  },
});
