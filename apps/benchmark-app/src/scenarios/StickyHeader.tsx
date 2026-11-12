import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  cancelAnimation,
  clamp,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { range } from '../components/range';
import type { ScenarioProps } from './registry';

const HEADER_HEIGHT = 120;
const COLLAPSED_HEADER_HEIGHT = 48;
const ITEM_HEIGHT = 56;
const SCROLL_DISTANCE = 400;
const HALF_CYCLE_MS = 1000;

export function StickyHeader({ load }: ScenarioProps) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const scrollTarget = useSharedValue(0);
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    scrollTarget.value = withRepeat(
      withTiming(SCROLL_DISTANCE, {
        duration: HALF_CYCLE_MS,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    return () => cancelAnimation(scrollTarget);
  }, [scrollTarget]);

  useAnimatedReaction(
    () => scrollTarget.value,
    (y) => scrollTo(scrollRef, 0, y, false)
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, SCROLL_DISTANCE],
          [0, COLLAPSED_HEADER_HEIGHT - HEADER_HEIGHT],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { minHeight: windowHeight + SCROLL_DISTANCE },
        ]}
        onScroll={onScroll}>
        {range(0, load).map((index) => (
          <Item key={index} index={index} scrollY={scrollY} />
        ))}
      </Animated.ScrollView>
      <Animated.View style={[styles.header, headerStyle]} />
    </View>
  );
}

function Item({
  index,
  scrollY,
}: {
  index: number;
  scrollY: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const top = HEADER_HEIGHT + index * ITEM_HEIGHT - scrollY.value;
    const visibility = clamp(top / HEADER_HEIGHT, 0, 1);
    return {
      opacity: visibility,
      transform: [{ scale: 0.8 + 0.2 * visibility }],
    };
  });

  return <Animated.View style={[styles.item, animatedStyle]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: HEADER_HEIGHT,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    backgroundColor: 'slateblue',
  },
  item: {
    height: ITEM_HEIGHT - 8,
    marginVertical: 4,
    marginHorizontal: 12,
    backgroundColor: 'lightsteelblue',
  },
});
