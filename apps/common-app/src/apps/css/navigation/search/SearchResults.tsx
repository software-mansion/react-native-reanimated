import { useNavigation } from '@react-navigation/native';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/apps/css/components';
import { colors, radius, spacing, text } from '@/theme';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import type { SearchDoc } from './fuse';

type SearchResultsProps = {
  searchResults: Array<SearchDoc>;
};

function SearchResults({ searchResults }: SearchResultsProps) {
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: SearchDoc }) => <ResultCard item={item} />,
    []
  );

  return searchResults.length ? (
    <FlatList
      contentContainerStyle={styles.scrollViewContent}
      data={searchResults}
      renderItem={renderItem}
      ListFooterComponent={() => (
        <View style={{ height: BOTTOM_BAR_HEIGHT + insets.bottom }} />
      )}
      ListHeaderComponent={() => (
        <Text style={styles.searchResultsText} variant="heading3">
          Search Results:
        </Text>
      )}
    />
  ) : (
    <Text style={styles.noResults}>No results found</Text>
  );
}

type ResultCardProps = {
  item: SearchDoc;
};

const ResultCard = memo(function ResultCard({ item }: ResultCardProps) {
  const navigation = useNavigation();

  return (
    <Pressable
      key={item.key}
      style={styles.resultCard}
      onPress={() => navigation.navigate(item.key as never)}>
      <Text style={styles.resultName}>{item.name}</Text>
      <Text style={styles.fullPath}>{item.breadcrumb}</Text>
    </Pressable>
  );
});

export default memo(SearchResults);

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
  searchResultsText: {
    marginBottom: spacing.sm,
  },
});
