import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { WithSpringConfig } from 'react-native-reanimated';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ScrollScreen, Stagger, Text } from '@/apps/css/components';
import { flex, spacing } from '@/theme';

import { searchRoutes } from './fuse';
import SearchBar, { MIN_SEARCH_SHOW_TRANSLATE_Y } from './SearchBar';
import SearchResults from './SearchResults';

const BOUNCE = 0.3; // 0 = no overshoot, 1 = infinite bounce
const DURATION = 0.5; // perceptual duration in seconds (≈ 500 ms)

const rubberBandSpring: WithSpringConfig = {
  stiffness: Math.pow((2 * Math.PI) / DURATION, 2),
  damping: ((1 - BOUNCE) * 4 * Math.PI) / DURATION,
  overshootClamping: false,
  restDisplacementThreshold: 0.1,
  restSpeedThreshold: 4,
};

type SearchScreenProps = {
  children: React.ReactNode;
};

export default function SearchScreen({ children }: SearchScreenProps) {
  const [inputEnabled, setInputEnabled] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const translateY = useSharedValue(0);
  const searchBarHeight = useSharedValue(0);
  const searchBarShown = useSharedValue(false);

  const hasQuery = !!searchQuery;
  const searchResults = useMemo(() => searchRoutes(searchQuery), [searchQuery]);

  const showSearchBar = useCallback(() => {
    'worklet';
    if (searchBarShown.value) {
      return;
    }
    searchBarShown.value = true;
    translateY.value = withSpring(searchBarHeight.value, rubberBandSpring);
    runOnJS(setInputEnabled)(true);
  }, [translateY, searchBarHeight, searchBarShown]);

  const hideSearchBar = useCallback(() => {
    'worklet';
    if (!searchBarShown.value) {
      return;
    }
    searchBarShown.value = false;
    translateY.value = withSpring(0, rubberBandSpring);
    runOnJS(setInputEnabled)(false);
  }, [translateY, searchBarShown]);

  const gesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        if (e.translationY > 0) {
          translateY.value = Math.pow(e.translationY, 0.9);
        }
      })
      .onEnd(() => {
        if (translateY.value > MIN_SEARCH_SHOW_TRANSLATE_Y) {
          showSearchBar();
        } else {
          hideSearchBar();
        }
      })
      .enabled(!hasQuery);

    const nativeGesture = Gesture.Native();

    return Gesture.Simultaneous(panGesture, nativeGesture);
  }, [translateY, hideSearchBar, showSearchBar, hasQuery]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <>
      <SearchBar
        inputEnabled={inputEnabled}
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
      <GestureDetector gesture={gesture}>
        <Animated.View style={[flex.fill, animatedStyle]}>
          {searchResults.length ? (
            <SearchResults
              searchBarHeight={searchBarHeight}
              searchQuery={searchQuery}
              searchResults={searchResults}
            />
          ) : searchQuery ? (
            <Text>No results found</Text>
          ) : (
            <ScrollScreen
              bounces={false}
              contentContainerStyle={styles.scrollViewContent}>
              <Stagger enabled={isFirstRender} interval={50}>
                {children}
              </Stagger>
            </ScrollScreen>
          )}
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
