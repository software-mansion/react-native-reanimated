import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Stagger } from '@/apps/css/components';
import { flex, spacing, style } from '@/theme';
import { IS_WEB } from '@/utils';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import ExpandableHeaderScreen, { ExpandMode } from './ExpandableHeaderScreen';
import { searchRoutes } from './fuse';
import PullToSearchIndicator from './PullToSearchIndicator';
import { usePullToSearch } from './PullToSearchProvider';
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
  const { pullToSearchShown, setPullToSearchShown } = usePullToSearch();

  const bottomInset = Platform.select({
    default: insets.bottom,
    web: spacing.md,
  });

  const searchBarShowProgress = useSharedValue(IS_WEB ? 1 : 0);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandMode, setExpandMode] = useState<ExpandMode>(
    IS_WEB ? ExpandMode.EXPANDED : ExpandMode.AUTO
  );
  const [isExpanded, setIsExpanded] = useState(IS_WEB);
  const [currentFilter, setCurrentFilter] = useState<Array<string> | null>(
    null
  );

  const hasSearchQuery = !!searchQuery;

  const changeIsExpanded = useCallback(
    (value: boolean) => {
      setIsExpanded(value);
      if (value) {
        setPullToSearchShown(true);
      }
    },
    [setPullToSearchShown, setIsExpanded]
  );

  useEffect(() => {
    if (IS_WEB) {
      return;
    }

    if (hasSearchQuery) {
      setExpandMode(ExpandMode.EXPANDED);
    } else {
      setExpandMode(ExpandMode.AUTO);
      return navigation.addListener(
        'transitionEnd',
        ({ data: { closing } }) => {
          changeIsExpanded(false);
          if (closing) {
            setPullToSearchShown(true);
            setExpandMode(ExpandMode.COLLAPSED);
          } else {
            setExpandMode(ExpandMode.AUTO);
          }
        }
      );
    }
  }, [hasSearchQuery, navigation, setPullToSearchShown, changeIsExpanded]);

  const queryResults = useMemo(() => searchRoutes(searchQuery), [searchQuery]);
  const filteredResults = useMemo(
    () =>
      currentFilter
        ? queryResults.filter((current) =>
            currentFilter?.every(
              (chunk, index) => current.item.path[index] === chunk
            )
          )
        : queryResults,
    [queryResults, currentFilter]
  );

  return (
    <View style={flex.fill}>
      {!IS_WEB && !pullToSearchShown && <PullToSearchIndicator />}
      <ExpandableHeaderScreen
        expandMode={expandMode}
        headerContainerStyle={styles.headerContainer}
        HeaderComponent={
          <SearchBar
            showProgress={searchBarShowProgress}
            value={searchQuery}
            onCancel={() => {
              setSearchQuery('');
              setCurrentFilter(null);
              if (!IS_WEB) {
                changeIsExpanded(false);
                setExpandMode(ExpandMode.COLLAPSED);
                setPullToSearchShown(true);
              }
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
          if (IS_WEB) {
            return;
          }

          searchBarShowProgress.value = progress;
          if (progress === 1) {
            scheduleOnRN(changeIsExpanded, true);
          } else if (progress === 0) {
            scheduleOnRN(changeIsExpanded, false);
          }
        }}>
        {(scrollProps) =>
          searchQuery ? (
            <Animated.View entering={FadeIn} style={flex.fill}>
              <SearchFilters
                currentFilter={currentFilter}
                queryResults={queryResults}
                setCurrentFilter={setCurrentFilter}
              />
              <SearchResults
                currentFilter={currentFilter}
                searchResults={filteredResults}
                onClearFilters={() => setCurrentFilter(null)}
                onClearSearch={() => setSearchQuery('')}
              />
            </Animated.View>
          ) : (
            <Animated.ScrollView
              contentContainerStyle={style.scrollViewContent}
              style={[
                flex.fill,
                IS_WEB && {
                  // @ts-expect-error - scrollbarGutter is a valid CSS property on web
                  scrollbarGutter: 'stable both-edges',
                },
              ]}
              {...scrollProps}>
              <Stagger enabled={!isExpanded} interval={50}>
                {children}
              </Stagger>
              <View style={{ height: BOTTOM_BAR_HEIGHT + bottomInset }} />
            </Animated.ScrollView>
          )
        }
      </ExpandableHeaderScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    justifyContent: 'center',
  },
});
