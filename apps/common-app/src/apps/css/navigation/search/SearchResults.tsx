import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/apps/css/components';
import { colors, radius, spacing, text } from '@/theme';

import { BOTTOM_BAR_HEIGHT, INITIAL_ROUTE_NAME } from '../constants';
import { searchRoutes } from './fuse';
import SearchFilters from './SearchFilters';

type SearchResultsProps = {
  searchQuery: string;
  searchBarHeight: SharedValue<number>;
};

export default function SearchResults({
  searchQuery,
  searchBarHeight,
}: SearchResultsProps) {
  const navigation = useNavigation();
  const state = navigation.getState();
  const insets = useSafeAreaInsets();

  const [currentFilter, setCurrentFilter] = useState<Array<string> | null>(
    () => {
      const routeName = state?.routes[state.routes.length - 1]?.name;
      if (routeName === INITIAL_ROUTE_NAME) {
        return null;
      }
      return routeName?.split('/') ?? null;
    }
  );
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
      {/* Spacer component */}
      <Animated.View style={{ height: searchBarHeight }} />
      <SearchFilters
        currentFilter={currentFilter}
        setCurrentFilter={setCurrentFilter}
      />
      {searchResults.length ? (
        <FlatList
          contentContainerStyle={styles.scrollViewContent}
          data={searchResults}
          ListFooterComponent={() => (
            <View style={{ height: BOTTOM_BAR_HEIGHT + insets.bottom }} />
          )}
          renderItem={({ item }) => (
            <Pressable
              key={item.key}
              style={styles.resultCard}
              onPress={() => navigation.navigate(item.key as never)}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.fullPath}>{item.breadcrumb}</Text>
            </Pressable>
          )}
        />
      ) : (
        <Text style={styles.noResults}>No results found</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fullPath: {
    ...text.body1,
    color: colors.foreground3,
  },
  noResults: {
    ...text.subHeading2,
    color: colors.foreground3,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  resultCard: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  resultName: {
    ...text.subHeading3,
    color: colors.foreground1,
  },
  scrollViewContent: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
