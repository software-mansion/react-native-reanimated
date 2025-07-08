import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ScrollScreen, Text } from '@/apps/css/components';
import { colors, radius, spacing, text } from '@/theme';

import type { SearchDoc } from './fuse';

type SearchResultsProps = {
  searchQuery: string;
  searchResults: Array<SearchDoc>;
  searchBarHeight: SharedValue<number>;
};

export default function SearchResults({
  searchQuery,
  searchResults,
  searchBarHeight,
}: SearchResultsProps) {
  // TODO - add custom scrollbar
  return (
    <>
      {/* Spacer component */}
      <Animated.View style={{ height: searchBarHeight }} />
      <ScrollScreen
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator>
        {searchResults.map((result) => (
          // TODO - fix these links, some are invalid
          <View key={result.key} style={styles.resultCard}>
            <Text navLink={result.key} style={styles.resultName}>
              {result.name}
            </Text>
            <Text style={styles.fullPath}>{result.breadcrumb}</Text>
          </View>
        ))}
      </ScrollScreen>
    </>
  );
}

const styles = StyleSheet.create({
  fullPath: {
    ...text.body1,
    color: colors.foreground3,
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
