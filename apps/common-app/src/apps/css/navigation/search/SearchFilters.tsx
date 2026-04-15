import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { FuseResult } from 'fuse.js';
import type { ComponentRef } from 'react';
import { Fragment, useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { SelectListOption } from '@/apps/css/components';
import { SelectListDropdown, Text } from '@/apps/css/components';
import { colors, flex, iconSizes, radius, spacing, style, text } from '@/theme';
import { IS_WEB } from '@/utils';

import type { Route, Routes } from '../types';
import { isRouteWithRoutes } from '../utils';
import type { SearchDoc } from './fuse';
import { ROUTES } from './fuse';

const NEXT_FILTER_KEY = '__next__';

type SearchFiltersProps = {
  currentFilter: Array<string> | null;
  queryResults: Array<FuseResult<SearchDoc>>;
  setCurrentFilter: (filter: Array<string> | null) => void;
};

export default function SearchFilters({
  currentFilter,
  queryResults,
  setCurrentFilter,
}: SearchFiltersProps) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [currentFilter]);

  const filterOptions = useMemo(() => {
    let currentRoutes = ROUTES as Routes;
    let currentResults = queryResults;
    let nextRoute: Route | undefined;
    const options: Array<{
      key: string;
      options: Array<SelectListOption<string>>;
    }> = [];

    const addNewOptions = (
      key: string,
      routes: Routes,
      resultCounts: Record<string, number>
    ) => {
      const handleRemove = () => {
        setCurrentFilter(
          currentFilter && currentFilter.slice(0, currentFilter.indexOf(key))
        );
      };

      const newOptions: Array<SelectListOption<string>> = Object.entries(
        routes
      ).map(([optionKey, value]) => ({
        label: `${value.name} (${resultCounts[optionKey] ?? 0})`,
        value: optionKey,
      }));

      if (key !== NEXT_FILTER_KEY) {
        newOptions.push({
          key: 'Remove',
          label: (
            <Pressable onPress={handleRemove}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ),
          value: '',
        });
      }

      options.push({
        key,
        options: newOptions,
      });
    };

    for (let i = 0; i < (currentFilter?.length ?? 0); i++) {
      const filterChunk = currentFilter![i];
      const resultCounts: Record<string, number> = {};
      const newResults: Array<FuseResult<SearchDoc>> = [];

      for (const result of currentResults) {
        const resultChunk = result.item.path[i];
        if (resultChunk === filterChunk) {
          newResults.push(result);
        }
        resultCounts[resultChunk] = (resultCounts[resultChunk] ?? 0) + 1;
      }

      addNewOptions(filterChunk, currentRoutes, resultCounts);

      nextRoute = currentRoutes[filterChunk];
      if (!isRouteWithRoutes(nextRoute)) {
        return options;
      }

      currentResults = newResults;
      currentRoutes = nextRoute.routes;
    }

    const resultCounts: Record<string, number> = {};
    const index = currentFilter?.length ?? 0;
    for (const result of currentResults) {
      const chunk = result.item.path[index];
      if (chunk) {
        resultCounts[chunk] = (resultCounts[chunk] ?? 0) + 1;
      }
    }

    if (
      nextRoute &&
      isRouteWithRoutes(nextRoute) &&
      Object.values(nextRoute.routes).some(isRouteWithRoutes)
    ) {
      addNewOptions(NEXT_FILTER_KEY, nextRoute.routes, resultCounts);
    }
    if (!options.length) {
      addNewOptions(NEXT_FILTER_KEY, currentRoutes, resultCounts);
    }

    return options;
  }, [currentFilter, setCurrentFilter, queryResults]);

  const handleSelect = (key: string, value: string) => {
    if (key === NEXT_FILTER_KEY) {
      setCurrentFilter([...(currentFilter ?? []), value]);
    } else if (currentFilter) {
      const index = currentFilter.indexOf(key);
      setCurrentFilter([...currentFilter.slice(0, index), value]);
    }
  };

  if (filterOptions.length === 1) {
    const { key, options } = filterOptions[0];

    return (
      <View style={[flex.row, styles.noFilters]}>
        <Text style={styles.title}>No filters selected</Text>
        <SelectListDropdown
          options={options}
          selected="Nothing"
          renderInput={() => (
            <View style={styles.selectFiltersInput}>
              <Text style={styles.selectFiltersInputText}>Select filters</Text>
            </View>
          )}
          onSelect={(value) => handleSelect(key, value)}
        />
      </View>
    );
  }

  const pathChunkCount =
    filterOptions[filterOptions.length - 1]?.key === NEXT_FILTER_KEY
      ? filterOptions.length - 2
      : filterOptions.length - 1;

  return (
    <View
      style={
        IS_WEB && { marginHorizontal: 'auto', maxWidth: '100%', width: 600 }
      }>
      <Text style={styles.title}>Searching in:</Text>
      <ScrollView
        contentContainerStyle={styles.filtersContentContainer}
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        style={IS_WEB && { marginHorizontal: spacing.lg }}
        horizontal>
        {filterOptions.map(({ key, options }, index) => {
          const isNextFilter = key === NEXT_FILTER_KEY;
          const renderInput = isNextFilter
            ? () => (
                <View style={[styles.filterInput, styles.filterArrow]}>
                  <FontAwesomeIcon
                    color={colors.primary}
                    icon={faChevronRight}
                    size={iconSizes.xs}
                  />
                </View>
              )
            : undefined;
          const formatInputLabel = isNextFilter
            ? undefined
            : (selected?: SelectListOption<string>) =>
                typeof selected?.label === 'string'
                  ? selected.label.replace(/\(.*\)$/, '')
                  : undefined;
          const showSeparator = index < pathChunkCount;

          return (
            <Fragment key={key}>
              <SelectListDropdown
                formatInputLabel={formatInputLabel}
                options={options}
                renderInput={renderInput}
                selected={key}
                styleOptions={{
                  chevronColor: colors.primary,
                  dropdownStyle: styles.dropdown,
                  inputStyle: styles.filterInput,
                  inputTextStyle: styles.filterInputText,
                }}
                fitInScreen
                onSelect={(value) => handleSelect(key, value)}
              />
              {showSeparator && <Text style={styles.pathSeparator}>/</Text>}
            </Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    minWidth: 150,
  },
  filterArrow: {
    paddingVertical: spacing.sm,
  },
  filterInput: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.xs,
  },
  filterInputText: {
    color: colors.primary,
  },
  filtersContentContainer: {
    ...style.scrollViewContent,
    gap: 0,
    paddingVertical: spacing.xs,
    ...(IS_WEB && { paddingHorizontal: 0 }),
  },
  noFilters: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    ...(IS_WEB && style.webContainer),
  },
  pathSeparator: {
    ...text.label2,
    color: colors.primary,
    paddingVertical: spacing.xs,
  },
  removeText: {
    ...text.label2,
    color: colors.danger,
  },
  selectFiltersInput: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  selectFiltersInputText: {
    ...text.label2,
    color: colors.white,
  },
  title: {
    ...text.label2,
    color: colors.foreground1,
    marginLeft: IS_WEB ? spacing.sm : spacing.lg,
    marginTop: spacing.xxs,
  },
});
