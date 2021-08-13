import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  Extrapolate,
  interpolate,
  withTiming,
} from 'react-native-reanimated';

// This function is copy-pastable and it's the responsible of the 'airbnb' header effect.
const airbnbScrollHandler = (
  ev: NativeScrollEvent,
  animatedValueRef: Animated.SharedValue<number>,
  a: Animated.SharedValue<number>,
  MAX_HEIGHT: number
) => {
  'worklet';
  const { y } = ev.contentOffset;
  const diff = y - a.value;
  const newAnimatedValue = animatedValueRef.value + diff;

  if (y < ev.contentSize.height - ev.layoutMeasurement.height) {
    if (y > MAX_HEIGHT) {
      if (y < a.value) {
        animatedValueRef.value = Math.max(0, newAnimatedValue);
      } else {
        if (animatedValueRef.value < MAX_HEIGHT) {
          animatedValueRef.value = Math.min(MAX_HEIGHT, newAnimatedValue);
        } else {
          animatedValueRef.value = MAX_HEIGHT;
        }
      }
      a.value = Math.max(0, y);
    } else {
      if (a.value) {
        a.value = Math.max(0, y);
        animatedValueRef.value = Math.max(0, newAnimatedValue);
      } else {
        animatedValueRef.value = y;
      }
    }
  }
};

const data = [
  'Hello',
  'Good bye',
  'Thank you',
  'Welcome',
  'Sunny',
  'Rainy',
  'Lorem',
  'Ipsum',
  ':D',
];
const colors = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'brown',
  'pink',
  'cyan',
  'orange',
];
const HEADER_HEIGHT = 60;
const AnimatedFlatlist = Animated.createAnimatedComponent(FlatList);

const AirbnbHeaderExample = (): React.ReactElement => {
  const animatedValue = useSharedValue(0);
  const backUpValue = useSharedValue(0);
  const headerStyle = useAnimatedStyle(() => {
    const opacity = withTiming(
      interpolate(
        animatedValue.value,
        [0, HEADER_HEIGHT],
        [1, 0.5],
        Extrapolate.CLAMP
      ),
      { duration: 10 }
    );
    const maxHeight = withTiming(
      interpolate(
        animatedValue.value,
        [0, HEADER_HEIGHT],
        [0, -HEADER_HEIGHT],
        Extrapolate.CLAMP
      ),
      { duration: 10 }
    );

    return {
      opacity: opacity,
      marginTop: maxHeight,
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (ev) =>
      airbnbScrollHandler(ev, animatedValue, backUpValue, HEADER_HEIGHT),
  });

  const scrollRef = useRef<any>();

  return (
    <View style={styles.container}>
      <Animated.View style={[headerStyle, styles.headerView]}>
        <Text style={styles.headerText}>Header</Text>
      </Animated.View>
      <AnimatedFlatlist
        ref={scrollRef}
        data={data}
        renderItem={({ item, index }) => (
          <View
            style={[styles.scrollElement, { backgroundColor: colors[index] }]}>
            <Text
              onPress={() => {
                scrollRef.current.scrollToOffset({ y: 0, animated: true });
              }}
              style={styles.littleText}>
              {item as string}
            </Text>
          </View>
        )}
        keyExtractor={(_item, index) => `element-${index}`}
        bounces
        scrollEventThrottle={1}
        onScroll={scrollHandler}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerView: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'grey',
  },
  headerText: {
    fontSize: 18,
    paddingTop: 12,
    paddingBottom: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  scrollElement: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  littleText: {
    fontSize: 12,
  },
});

export default AirbnbHeaderExample;