import React, { useMemo } from 'react';
import { ScrollViewProps, View } from 'react-native';
import Animated, {
  measure,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Text } from '@/apps/css/components';

const demoItems = Array.from({ length: 50 }, (_, i) => (
  <View
    key={i}
    style={{ height: 100, backgroundColor: `hsl(${i * 18}, 100%, 50%)` }}>
    <Text>Item {i}</Text>
  </View>
));

const SPRING = { stiffness: 140, damping: 22, mass: 0.6 };
const POW = 0.9;
const EDGE_SLACK = 2;
const VELOCITY_FACTOR = 6;
const OUT_MS = 100;

const SEARCH_BAR_HEIGHT = 100;

type Props = ScrollViewProps & { children?: React.ReactNode };

export default function BounceScrollView({ children, ...rest }: Props) {
  const scrollY = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragStartTranslateY = useSharedValue(0);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const contentRef = useAnimatedRef<Animated.View>();

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        dragStartTranslateY.value = translateY.value;
      })
      .onUpdate((e) => {
        const scrollViewMeasurements = measure(scrollRef);
        const contentMeasurements = measure(contentRef);

        if (translateY.value > 0) {
          translateY.value = dragStartTranslateY.value + e.translationY;
          return;
        }

        if (
          !scrollViewMeasurements ||
          !contentMeasurements ||
          (scrollY.value > 0 &&
            scrollY.value <
              Math.floor(
                contentMeasurements.height - scrollViewMeasurements.height
              ))
        ) {
          return;
        }

        translateY.value =
          Math.sign(e.translationY) * Math.pow(Math.abs(e.translationY), POW);
      })
      .onEnd(() => {
        if (translateY.value > SEARCH_BAR_HEIGHT) {
          translateY.value = withSpring(SEARCH_BAR_HEIGHT, SPRING);
        } else {
          translateY.value = withSpring(0, SPRING);
        }
      });

    return Gesture.Simultaneous(pan, Gesture.Native());
  }, [contentRef, scrollRef, scrollY, translateY, dragStartTranslateY]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - scrollY.value;
      velocityY.value = dy * VELOCITY_FACTOR; // px/s (approx)
      scrollY.value = y;

      const sv = measure(scrollRef);
      const cv = measure(contentRef);
      if (!sv || !cv) return;

      if (y > EDGE_SLACK && y < cv.height - sv.height - EDGE_SLACK) {
        return;
      }

      const v = velocityY.value;
      const outward = -Math.sign(v) * Math.pow(Math.abs(v), POW);

      translateY.value = withSequence(
        withTiming(outward, { duration: OUT_MS }),
        withSpring(0, SPRING)
      );
    },
  });

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Text>Hello world!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
