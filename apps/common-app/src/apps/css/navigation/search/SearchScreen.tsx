import { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { WithSpringConfig } from 'react-native-reanimated';
import Animated, {
  clamp,
  measure,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stagger } from '@/apps/css/components';
import { spacing } from '@/theme';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';

const SPRING: WithSpringConfig = { stiffness: 140, damping: 22, mass: 0.6 };
const POW = 0.9;
const EDGE_SLACK = 2;
const VELOCITY_FACTOR = 6;
const OUT_MS = 100;

type SearchScreenProps = {
  children: React.ReactNode;
};

export default function SearchScreen({ children }: SearchScreenProps) {
  const insets = useSafeAreaInsets();

  const inset = Platform.select({
    default: insets.bottom,
    web: spacing.md,
  });

  const scrollY = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragStartTranslateY = useSharedValue(0);
  const searchBarHeight = useSharedValue(0);
  const searchBarShowProgress = useSharedValue(0);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const contentRef = useAnimatedRef<View>();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFirstRender, setIsFirstRender] = useState(true);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        dragStartTranslateY.value = translateY.value;
      })
      .onUpdate((e) => {
        const scrollViewMeasurements = measure(scrollRef);
        const contentMeasurements = measure(contentRef);

        if (dragStartTranslateY.value > 0) {
          translateY.value = dragStartTranslateY.value + e.translationY;
        } else {
          const shouldShowSearchBar = scrollY.value <= 0;
          const shouldBounce =
            contentMeasurements &&
            scrollViewMeasurements &&
            (shouldShowSearchBar ||
              scrollY.value >=
                Math.floor(
                  contentMeasurements.height - scrollViewMeasurements.height
                ));

          if (shouldBounce) {
            translateY.value =
              Math.sign(e.translationY) *
              Math.pow(Math.abs(e.translationY), POW);
          }

          if (!shouldBounce || !shouldShowSearchBar) {
            searchBarShowProgress.value = 0;
            return;
          }
        }

        searchBarShowProgress.value = clamp(
          translateY.value / searchBarHeight.value,
          0,
          1
        );
      })
      .onFinalize(() => {
        if (searchBarShowProgress.value === 1) {
          translateY.value = withSpring(searchBarHeight.value, SPRING);
        } else {
          translateY.value = withSpring(0, SPRING);
          searchBarShowProgress.value = withSpring(0, SPRING);
        }
      });

    return Gesture.Simultaneous(pan, Gesture.Native());
  }, [
    contentRef,
    scrollRef,
    scrollY,
    translateY,
    dragStartTranslateY,
    searchBarHeight,
    searchBarShowProgress,
  ]);

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <>
      {searchQuery ? (
        <SearchResults
          searchBarHeight={searchBarHeight}
          searchQuery={searchQuery}
        />
      ) : (
        <GestureDetector gesture={gesture}>
          <Animated.ScrollView
            bounces={false}
            overScrollMode="never"
            ref={scrollRef}
            onScroll={scrollHandler}>
            <Animated.View
              ref={contentRef}
              style={[styles.scrollViewContent, animatedStyle]}>
              <Stagger enabled={isFirstRender} interval={50}>
                {children}
              </Stagger>
              <View style={{ height: BOTTOM_BAR_HEIGHT + inset }} />
            </Animated.View>
          </Animated.ScrollView>
        </GestureDetector>
      )}
      <SearchBar
        searchBarHeight={searchBarHeight}
        showProgress={searchBarShowProgress}
        translateY={translateY}
        value={searchQuery}
        onSearch={(query) => {
          setSearchQuery(query);
          setIsFirstRender(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
