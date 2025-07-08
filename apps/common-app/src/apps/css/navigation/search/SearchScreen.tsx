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

import { Stagger, Text } from '@/apps/css/components';
import { spacing } from '@/theme';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import { searchRoutes } from './fuse';
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

  const searchResults = useMemo(() => searchRoutes(searchQuery), [searchQuery]);

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
        } else if (
          scrollViewMeasurements &&
          contentMeasurements &&
          (scrollY.value <= 0 ||
            scrollY.value >=
              Math.floor(
                contentMeasurements.height - scrollViewMeasurements.height
              ))
        ) {
          translateY.value =
            Math.sign(e.translationY) * Math.pow(Math.abs(e.translationY), POW);
        } else {
          return;
        }

        searchBarShowProgress.value = clamp(
          translateY.value / searchBarHeight.value,
          0,
          1
        );
      })
      .onFinalize(() => {
        if (translateY.value > searchBarHeight.value) {
          translateY.value = withSpring(searchBarHeight.value, SPRING);
          searchBarShowProgress.value = withSpring(1, SPRING);
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
    },
    onMomentumEnd: (e) => {
      const sv = measure(scrollRef);
      const cv = measure(contentRef);
      if (!sv || !cv) return;
      const y = e.contentOffset.y;
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
      {searchResults.length ? (
        <SearchResults
          searchBarHeight={searchBarHeight}
          searchQuery={searchQuery}
          searchResults={searchResults}
        />
      ) : searchQuery ? (
        <Text>No results found</Text>
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
            </Animated.View>
            <View style={{ height: BOTTOM_BAR_HEIGHT + inset }} />
          </Animated.ScrollView>
        </GestureDetector>
      )}
      <SearchBar
        showProgress={searchBarShowProgress}
        translateY={translateY}
        value={searchQuery}
        onMeasure={(height) => {
          searchBarHeight.value = height;
        }}
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
