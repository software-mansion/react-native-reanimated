import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ScrollScreen, Text } from '@/apps/css/components';
import { colors, radius, spacing, text } from '@/theme';

import type { SearchDoc } from './fuse';
import { searchRoutes } from './fuse';

type SearchResultsProps = {
  searchQuery: string;
  searchBarHeight: SharedValue<number>;
};

type GroupedResults = {
  [mainGroup: string]: {
    subGroups: { [subGroup: string]: Array<SearchDoc> };
    directResults: Array<SearchDoc>;
  };
};

export default function SearchResults({
  searchQuery,
  searchBarHeight,
}: SearchResultsProps) {
  const searchResults = useMemo(() => searchRoutes(searchQuery), [searchQuery]);
  const groupedResults = useMemo(() => {
    return searchResults.reduce<GroupedResults>((acc, result) => {
      const mainGroup = result.path[0];
      const subGroup = result.path[1];

      if (!acc[mainGroup]) {
        acc[mainGroup] = {
          subGroups: {},
          directResults: [],
        };
      }

      if (subGroup) {
        // Create subgroup if second path segment exists
        if (!acc[mainGroup].subGroups[subGroup]) {
          acc[mainGroup].subGroups[subGroup] = [];
        }
        acc[mainGroup].subGroups[subGroup].push(result);
      } else {
        // No subgroup, store directly
        acc[mainGroup].directResults.push(result);
      }
      return acc;
    }, {});
  }, [searchResults]);

  return (
    <>
      {/* Spacer component */}
      <Animated.View style={{ height: searchBarHeight }} />
      {searchResults.length ? (
        <ScrollScreen
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator>
          {Object.entries(groupedResults).map(([mainTitle, groupData]) => (
            <MainGroup
              groupData={groupData}
              key={mainTitle}
              mainTitle={mainTitle}
            />
          ))}
        </ScrollScreen>
      ) : (
        <Text style={styles.noResults}>No results found</Text>
      )}
    </>
  );
}

type MainGroupProps = {
  mainTitle: string;
  groupData: {
    subGroups: { [subGroup: string]: Array<SearchDoc> };
    directResults: Array<SearchDoc>;
  };
};

function MainGroup({ mainTitle, groupData }: MainGroupProps) {
  const navigation = useNavigation();
  const { subGroups, directResults } = groupData;

  return (
    <View style={styles.group}>
      <Text style={styles.mainGroupTitle}>{mainTitle}</Text>
      {directResults.length > 0 &&
        directResults.map((result) => (
          <Pressable
            key={result.key}
            style={styles.resultCard}
            onPress={() => navigation.navigate(result.key as never)}>
            <Text style={styles.resultName}>{result.name}</Text>
            <Text style={styles.fullPath}>{result.breadcrumb}</Text>
          </Pressable>
        ))}
      {Object.entries(subGroups).map(([subTitle, results]) => (
        <SubGroup key={subTitle} results={results} subTitle={subTitle} />
      ))}
    </View>
  );
}

type SubGroupProps = {
  subTitle: string;
  results: Array<SearchDoc>;
};

function SubGroup({ subTitle, results }: SubGroupProps) {
  const navigation = useNavigation();

  return (
    <View style={styles.group}>
      <Text style={styles.subGroupTitle}>{subTitle}</Text>
      {results.map((result) => (
        // TODO - fix these links, some are invalid
        <Pressable
          key={result.key}
          style={styles.resultCard}
          onPress={() => navigation.navigate(result.key as never)}>
          <Text style={styles.resultName}>{result.name}</Text>
          <Text style={styles.fullPath}>{result.breadcrumb}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fullPath: {
    ...text.body1,
    color: colors.foreground3,
  },
  group: {
    gap: spacing.xs,
  },
  mainGroupTitle: {
    ...text.heading3,
    color: colors.foreground1,
    marginTop: spacing.sm,
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
  subGroupTitle: {
    ...text.subHeading2,
    color: colors.foreground2,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    marginTop: spacing.xxs,
  },
});
