import { useNavigation } from '@react-navigation/native';
import { memo, useCallback, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/apps/css/components';
import { colors, flex, radius, spacing, style, text } from '@/theme';
import { IS_IOS, IS_WEB } from '@/utils';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import type { SearchDoc } from './fuse';

type SearchResultsProps = {
  searchResults: Array<SearchDoc>;
  currentFilter: Array<string> | null;
  onClearFilters: () => void;
  onClearSearch: () => void;
};

export default function SearchResults({
  currentFilter,
  onClearFilters,
  onClearSearch,
  searchResults,
}: SearchResultsProps) {
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: SearchDoc }) => (
      <ResultCard currentFilter={currentFilter} item={item} />
    ),
    [currentFilter]
  );

  const list = (
    <FlatList
      contentContainerStyle={styles.contentContainer}
      data={searchResults}
      renderItem={renderItem}
      ListFooterComponent={() => (
        <View style={{ height: BOTTOM_BAR_HEIGHT + insets.bottom }} />
      )}
      ListHeaderComponent={() => (
        <Text style={styles.searchResultsText} variant="heading3">
          Search Results ({searchResults.length}):
        </Text>
      )}
      style={
        IS_WEB && {
          // @ts-expect-error - scrollbarGutter is a valid CSS property on web
          scrollbarGutter: 'stable both-edges',
        }
      }
    />
  );

  const results = IS_WEB ? (
    list
  ) : (
    <KeyboardAvoidingView
      behavior={IS_IOS ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
      style={flex.fill}>
      {list}
    </KeyboardAvoidingView>
  );

  return searchResults.length ? (
    results
  ) : (
    <View style={styles.noResultsContainer}>
      <Text style={styles.noResults}>No results found</Text>
      <View style={styles.clearButtons}>
        {currentFilter && (
          <Button title="Clear filters" onPress={onClearFilters} />
        )}
        <Button
          // Button uses has layout transition which we don't want to trigger
          // when the filters bar is hidden/shown.
          key={`${!!currentFilter}`}
          title="Clear search"
          onPress={onClearSearch}
        />
      </View>
    </View>
  );
}

type ResultCardProps = {
  item: SearchDoc;
  currentFilter: Array<string> | null;
};

const ResultCard = memo(function ResultCard({
  currentFilter,
  item,
}: ResultCardProps) {
  const navigation = useNavigation();

  const boldedPath = useMemo(() => {
    if (!currentFilter) {
      return item.breadcrumb;
    }
    const boldedChunks = [];
    let index = 0;
    for (index = 0; index < currentFilter.length; index++) {
      const pathChunk = item.path[index];
      if (pathChunk && pathChunk === currentFilter[index]) {
        boldedChunks.push(pathChunk);
      }
    }

    const remainingPath = item.path.slice(index).join(' / ');

    return (
      `**${boldedChunks.join(' / ')}**` +
      (remainingPath ? ` / ${remainingPath}` : '')
    );
  }, [currentFilter, item]);

  return (
    <Pressable
      key={item.key}
      style={styles.resultCard}
      onPress={() => navigation.navigate(item.key as never)}>
      <Text style={styles.resultName}>{item.name}</Text>
      <Text style={styles.fullPath}>{boldedPath}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  clearButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-start',
  },
  contentContainer: {
    ...style.scrollViewContent,
    gap: spacing.xs,
  },
  fullPath: {
    ...text.body1,
    color: colors.foreground3,
  },
  noResults: {
    ...text.subHeading2,
    color: colors.foreground3,
  },
  noResultsContainer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...(IS_WEB && style.webContainer),
  },
  resultCard: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  resultName: {
    ...text.subHeading3,
    color: colors.foreground1,
  },
  searchResultsText: {
    marginBottom: spacing.sm,
  },
});
