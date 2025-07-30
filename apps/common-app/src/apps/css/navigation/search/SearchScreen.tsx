import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { WithSpringConfig } from 'react-native-reanimated';
import Animated, {
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stagger } from '@/apps/css/components';
import { spacing } from '@/theme';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import { INITIAL_ROUTE_NAME } from '../routes';
import { searchRoutes } from './fuse';
import SearchBar from './SearchBar';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';

const PULL_TO_SEARCH_SHOW_DELAY = 1000;
const PULL_TO_SEARCH_SHOW_DURATION = 2000;

const SPRING: WithSpringConfig = { stiffness: 140, damping: 22, mass: 0.6 };
const POW = 0.9;
const EDGE_SLACK = 2;
const VELOCITY_FACTOR = 6;
const OUT_MS = 100;

type SearchScreenProps = {
  children: React.ReactNode;
};

export default function SearchScreen({ children }: SearchScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const state = navigation.getState();

  const inset = Platform.select({
    default: insets.bottom,
    web: spacing.md,
  });

  const scrollY = useSharedValue(0);
  const searchBarContainerHeight = useSharedValue(0);
  const translateY = useSharedValue(0);
  const searchBarHeight = useSharedValue(0);
  const searchBarShowProgress = useSharedValue(0);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const [isFirstRender, setIsFirstRender] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState<Array<string> | null>(
    () => {
      const routeName = state?.routes[state.routes.length - 1]?.name;
      if (routeName === INITIAL_ROUTE_NAME) {
        return null;
      }
      return routeName?.split('/') ?? null;
    }
  );

  const hasSearchQuery = !!searchQuery;
  const isFocused = navigation.isFocused();

  const searchResults = useMemo(() => {
    const result = searchRoutes(searchQuery);

    if (currentFilter) {
      return result.filter((current) =>
        currentFilter?.every((chunk, index) => current.path[index] === chunk)
      );
    }

    return result;
  }, [searchQuery, currentFilter]);

  // useEffect(() => {
  //   if (!shouldShowPullToSearch || !isFocused) return;
  //   shouldShowPullToSearch = false;

  //   setTimeout(() => {
  //     if (searchBarShowProgress.value > 0) {
  //       return;
  //     }

  //     showPullToSearch.value = true;
  //     translateY.value = withSequence(
  //       withSpring(100, SPRING),
  //       withDelay(
  //         PULL_TO_SEARCH_SHOW_DURATION,
  //         withSequence(
  //           withTiming(100, { duration: 0 }, () => {
  //             showPullToSearch.value = false;
  //           }),
  //           withSpring(0, SPRING)
  //         )
  //       )
  //     );
  //   }, PULL_TO_SEARCH_SHOW_DELAY);
  // }, [translateY, showPullToSearch, isFocused, searchBarShowProgress]);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (!hasSearchQuery) {
        setSearchQuery('');
        searchBarShowProgress.value = 0;
      }
    });
  }, [navigation, hasSearchQuery, searchBarShowProgress]);

  const scrollHandler = useAnimatedScrollHandler<{
    dragStartTranslateY: number;
    isDragging: boolean;
    shrinkStartScrollY?: number;
    shrinkStartContainerHeight?: number;
  }>({
    onBeginDrag: (_, ctx) => {
      delete ctx.shrinkStartScrollY;
      delete ctx.shrinkStartContainerHeight;
      ctx.dragStartTranslateY = translateY.value;
      ctx.isDragging = true;
    },
    onEndDrag: (_, ctx) => {
      ctx.isDragging = false;
      if (searchBarShowProgress.value < 1) {
        translateY.value = withSpring(0, SPRING);
        searchBarShowProgress.value = withSpring(0, SPRING);
        searchBarContainerHeight.value = withSpring(0, SPRING);
      }
    },
    onScroll: (e, ctx) => {
      const y = e.contentOffset.y;
      scrollY.value = y;

      if (y < 0) {
        // Opening the search bar
        if (ctx.isDragging) {
          // Show search bar while pulling down
          searchBarContainerHeight.value =
            Math.max(0, -y) +
            (ctx.dragStartTranslateY > 0
              ? (translateY.value / ctx.dragStartTranslateY) *
                searchBarHeight.value
              : 0);
          searchBarShowProgress.value = interpolate(
            searchBarContainerHeight.value,
            [0, searchBarHeight.value],
            [0, 1],
            Extrapolation.CLAMP
          );
          console.log('>>> is dragging', searchBarShowProgress.value);
        } else if (searchBarShowProgress.value === 1) {
          // Shrink search bar container to the search bar height and translate
          // the ScrollView content to appear below it when the search bar should
          // stay open
          ctx.shrinkStartScrollY ??= y;
          ctx.shrinkStartContainerHeight ??= searchBarContainerHeight.value;
          searchBarContainerHeight.value = interpolate(
            y,
            [ctx.shrinkStartScrollY, 0],
            [ctx.shrinkStartContainerHeight, searchBarHeight.value]
          );
          translateY.value = interpolate(
            y,
            [ctx.shrinkStartScrollY, 0],
            [ctx.dragStartTranslateY, searchBarHeight.value - spacing.xs]
          );
        }
        console.log(
          '>>> is not dragging and === 1',
          searchBarShowProgress.value
        );
      } else if (y > 0 && ctx.isDragging && searchBarShowProgress.value > 0) {
        // Closing the search bar (if open)
        translateY.value -= y;
        searchBarContainerHeight.value -= y;
        searchBarShowProgress.value = interpolate(
          translateY.value,
          [0, ctx.dragStartTranslateY],
          [0, 1],
          Extrapolation.CLAMP
        );
        scrollTo(scrollViewRef, 0, 0, false);
        console.log('>>> is not dragging and > 0', searchBarShowProgress.value);
      }
    },
  });

  const animatedSearchBarContainerStyle = useAnimatedStyle(() => ({
    height: searchBarContainerHeight.value,
  }));

  const animatedScrollViewStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <>
      {/* {shouldShowPullToSearch && (
        <PullToSearchIndicator show={showPullToSearch} />
      )} */}

      {searchQuery && (
        <>
          <Animated.View style={{ height: searchBarHeight }} />
          <SearchFilters
            currentFilter={currentFilter}
            setCurrentFilter={setCurrentFilter}
          />
          <SearchResults searchResults={searchResults} />
        </>
      )}
      <Animated.View
        style={[styles.searchBarContainer, animatedSearchBarContainerStyle]}>
        <SearchBar
          showProgress={searchBarShowProgress}
          value={searchQuery}
          onMeasureHeight={(height) => {
            searchBarHeight.value = height;
          }}
          onSearch={(query) => {
            setSearchQuery(query);
            setIsFirstRender(false);
          }}
        />
      </Animated.View>
      {!searchQuery && (
        <Animated.ScrollView
          contentContainerStyle={styles.scrollViewContent}
          ref={scrollViewRef}
          style={animatedScrollViewStyle}
          onScroll={scrollHandler}>
          <Stagger enabled={isFirstRender} interval={50}>
            {children}
          </Stagger>
          <View style={{ height: BOTTOM_BAR_HEIGHT + inset }} />
        </Animated.ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchBarContainer: {
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
