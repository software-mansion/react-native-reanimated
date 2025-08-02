import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { WithSpringConfig } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stagger } from '@/apps/css/components';
import { spacing } from '@/theme';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import { INITIAL_ROUTE_NAME } from '../routes';
import ExpandableHeaderScreen from './ExpandableHeaderScreen';
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

enum SearchBarState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  TRANSITIONING = 'TRANSITIONING',
}

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

  const searchBarHeight = useSharedValue(0);
  const searchBarShowProgress = useSharedValue(0);

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

  return (
    <>
      {/* {shouldShowPullToSearch && (
        <PullToSearchIndicator show={showPullToSearch} />
      )} */}

      <ExpandableHeaderScreen
        contentContainerStyle={styles.scrollViewContent}
        headerContainerStyle={styles.headerContainer}
        headerShowProgress={searchBarShowProgress}
        header={
          <SearchBar
            showProgress={searchBarShowProgress}
            value={searchQuery}
            onSearch={(query) => {
              setSearchQuery(query);
              setIsFirstRender(false);
            }}
          />
        }>
        {searchQuery ? (
          <>
            <SearchFilters
              currentFilter={currentFilter}
              setCurrentFilter={setCurrentFilter}
            />
            <SearchResults searchResults={searchResults} />
          </>
        ) : (
          <Stagger enabled={isFirstRender} interval={50}>
            {children}
          </Stagger>
        )}
        <View style={{ height: BOTTOM_BAR_HEIGHT + inset }} />
      </ExpandableHeaderScreen>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    justifyContent: 'center',
  },
  scrollViewContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
