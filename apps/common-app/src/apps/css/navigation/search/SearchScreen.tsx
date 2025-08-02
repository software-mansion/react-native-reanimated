import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runOnJS } from 'react-native-worklets';

import { Stagger } from '@/apps/css/components';
import { flex, spacing } from '@/theme';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import { INITIAL_ROUTE_NAME } from '../routes';
import ExpandableHeaderScreen, { ExpandMode } from './ExpandableHeaderScreen';
import { searchRoutes } from './fuse';
import SearchBar from './SearchBar';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';

type SearchScreenProps = {
  children: React.ReactNode;
};

export default function SearchScreen({ children }: SearchScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<Record<string, never>>>();
  const insets = useSafeAreaInsets();
  const state = navigation.getState();

  const bottomInset = Platform.select({
    default: insets.bottom,
    web: spacing.md,
  });

  const searchBarShowProgress = useSharedValue(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandMode, setExpandMode] = useState<ExpandMode>(ExpandMode.AUTO);
  const [isExpanded, setIsExpanded] = useState(false);
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

  useEffect(() => {
    if (hasSearchQuery) {
      setExpandMode(ExpandMode.EXPANDED);
    } else {
      setExpandMode(ExpandMode.AUTO);
      return navigation.addListener(
        'transitionEnd',
        ({ data: { closing } }) => {
          setExpandMode(closing ? ExpandMode.COLLAPSED : ExpandMode.AUTO);
          setIsExpanded(false);
        }
      );
    }
  }, [hasSearchQuery, navigation]);

  const searchResults = useMemo(() => {
    const result = searchRoutes(searchQuery);

    if (currentFilter) {
      return result.filter((current) =>
        currentFilter?.every((chunk, index) => current.path[index] === chunk)
      );
    }

    return result;
  }, [searchQuery, currentFilter]);

  return (
    <>
      {/* {shouldShowPullToSearch && (
        <PullToSearchIndicator show={showPullToSearch} />
      )} */}

      <ExpandableHeaderScreen
        expandMode={expandMode}
        headerContainerStyle={styles.headerContainer}
        HeaderComponent={
          <SearchBar
            showProgress={searchBarShowProgress}
            value={searchQuery}
            onCancel={() => {
              setSearchQuery('');
              setIsExpanded(false);
              setExpandMode(ExpandMode.COLLAPSED);
            }}
            onChangeText={(query) => {
              if (isExpanded) {
                setSearchQuery(query);
              }
            }}
          />
        }
        onHeaderShowProgressChange={(progress) => {
          'worklet';
          searchBarShowProgress.value = progress;
          if (progress === 1) {
            runOnJS(setIsExpanded)(true);
          } else if (progress === 0) {
            runOnJS(setIsExpanded)(false);
          }
        }}>
        {(scrollProps) =>
          searchQuery ? (
            <Animated.View entering={FadeIn}>
              <SearchFilters
                currentFilter={currentFilter}
                setCurrentFilter={setCurrentFilter}
              />
              <SearchResults searchResults={searchResults} />
            </Animated.View>
          ) : (
            <Animated.ScrollView
              contentContainerStyle={styles.content}
              style={flex.fill}
              {...scrollProps}>
              <Stagger enabled={!isExpanded} interval={50}>
                {children}
              </Stagger>
              <View style={{ height: BOTTOM_BAR_HEIGHT + bottomInset }} />
            </Animated.ScrollView>
          )
        }
      </ExpandableHeaderScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    minHeight: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerContainer: {
    justifyContent: 'center',
  },
});
