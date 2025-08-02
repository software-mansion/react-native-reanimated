import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { WithSpringConfig } from 'react-native-reanimated';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useScrollOffset,
  useSharedValue,
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

  const dragEndOffsetY = useSharedValue<number | null>(null);
  const searchBarHeight = useSharedValue(0);
  const isSearchBarOpen = useSharedValue(false);

  const searchBarContainerHeight = useSharedValue(0);
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

  // const scrollHandler = useAnimatedScrollHandler({
  //   onBeginDrag: () => {
  //     dragEndOffsetY.value = null;
  //   },
  //   onEndDrag: () => {
  //     dragEndOffsetY.value = offsetY.value;
  //     isSearchBarOpen.value = searchBarShowProgress.value === 1;
  //   },
  //   onScroll: ({ contentOffset: { y } }) => {
  //     offsetY.value = y;
  //     if (dragEndOffsetY.value === null) {
  //       searchBarShowProgress.value = interpolate(
  //         -y + translateY.value,
  //         [0, searchBarHeight.value],
  //         [0, 1],
  //         Extrapolation.CLAMP
  //       );
  //       if (searchBarShowProgress.value < 0) {
  //         isSearchBarOpen.value = false;
  //       }
  //     } else if (isSearchBarOpen.value) {
  //       translateY.value = interpolate(
  //         offsetY.value,
  //         [dragEndOffsetY.value, 0],
  //         [0, searchBarHeight.value],
  //         Extrapolation.CLAMP
  //       );
  //     }
  //     console.log(
  //       '>>>',
  //       searchBarShowProgress.value,
  //       isSearchBarOpen.value,
  //       translateY.value,
  //       offsetY.value
  //     );
  //   },
  // });

  const translateY = useSharedValue(0);
  const scrollOffset = useScrollOffset(scrollViewRef);
  const totalOffsetY = useDerivedValue(
    () => scrollOffset.value + translateY.value
  );
  const searchBarShowProgress = useDerivedValue(() =>
    interpolate(
      -totalOffsetY.value,
      [0, searchBarHeight.value],
      [0, 1],
      Extrapolation.CLAMP
    )
  );

  const gesture = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Native(),
        Gesture.Pan()
          .onUpdate((e) => {
            console.log('>>>', e.translationY);
          })
          .onEnd(() => {})
      ),
    []
  );

  const animatedSearchBarContainerStyle = useAnimatedStyle(() => ({
    height:
      dragEndOffsetY.value !== null && isSearchBarOpen.value
        ? interpolate(
            totalOffsetY.value,
            [dragEndOffsetY.value, 0],
            [-dragEndOffsetY.value, searchBarHeight.value],
            Extrapolation.CLAMP
          )
        : Math.max(0, -totalOffsetY.value),
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
        <GestureDetector gesture={gesture}>
          <Animated.ScrollView
            contentContainerStyle={styles.scrollViewContent}
            ref={scrollViewRef}
            style={animatedScrollViewStyle}>
            <Stagger enabled={isFirstRender} interval={50}>
              {children}
            </Stagger>
            <View style={{ height: BOTTOM_BAR_HEIGHT + inset }} />
          </Animated.ScrollView>
        </GestureDetector>
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
    backgroundColor: 'red',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
