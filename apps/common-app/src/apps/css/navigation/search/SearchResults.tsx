import { useNavigation } from '@react-navigation/native';
import type { FuseResult } from 'fuse.js';
import { memo, useCallback, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Label, Text } from '@/apps/css/components';
import { colors, flex, radius, spacing, style, text } from '@/theme';
import { IS_IOS, IS_WEB } from '@/utils';

import { BOTTOM_BAR_HEIGHT } from '../constants';
import type { SearchDoc } from './fuse';

type SearchResultsProps = {
  searchResults: Array<FuseResult<SearchDoc>>;
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
    ({ item }: { item: FuseResult<SearchDoc> }) => (
      <ResultCard currentFilter={currentFilter} searchResult={item} />
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
  searchResult: FuseResult<SearchDoc>;
  currentFilter: Array<string> | null;
};

const ResultCard = memo(function ResultCard({
  currentFilter,
  searchResult: { item, matches },
}: ResultCardProps) {
  const navigation = useNavigation();

  const formatted = useMemo(() => {
    const formattedValues: Record<string, string> = {};
    matches?.forEach(({ indices, key, value }) => {
      if (!key || !value) return;

      let result = '';
      let last = 0;

      for (let i = 0; i < indices.length; i++) {
        const [start, end] = indices[i];

        // append unhighlighted part
        if (start > last) result += value.slice(last, start);
        // append highlighted substring
        result += `**${value.slice(start, end + 1)}**`;

        last = end + 1;
      }

      // append any remaining tail
      if (last < value.length) result += value.slice(last);

      formattedValues[key] = result;
    });

    let path = formattedValues.breadcrumb ?? item.breadcrumb;
    if (currentFilter) {
      path = `./${path.split('/').slice(currentFilter.length).join('/')}`;
    }

    return {
      name: formattedValues.name ?? item.name,
      path,
    };
  }, [currentFilter, item, matches]);

  return (
    <Pressable
      key={item.key}
      style={styles.resultCard}
      onPress={() => navigation.navigate(item.key as never)}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultName}>{formatted.name}</Text>
        {item.labelTypes?.map((labelType) => (
          <Label key={labelType} size="small" type={labelType} />
        ))}
      </View>
      <Text style={styles.fullPath}>{formatted.path}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  clearButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
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
  resultHeader: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-start',
  },
  resultName: {
    ...text.subHeading3,
    alignSelf: 'center',
    color: colors.foreground1,
  },
  searchResultsText: {
    marginBottom: spacing.sm,
  },
});
