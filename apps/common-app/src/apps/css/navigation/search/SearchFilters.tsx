import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Fragment, memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { SelectListOption } from '@/apps/css/components';
import { SelectListDropdown, Text } from '@/apps/css/components';
import { colors, flex, iconSizes, radius, sizes, spacing, text } from '@/theme';

import type { Route, Routes } from '../types';
import { isRouteWithRoutes } from '../utils';
import { ROUTES } from './fuse';

const NEXT_FILTER_KEY = '__next__';

type SearchFiltersProps = {
  currentFilter: Array<string> | null;
  setCurrentFilter: (filter: Array<string> | null) => void;
};

function SearchFilters({
  currentFilter,
  setCurrentFilter,
}: SearchFiltersProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [currentFilter]);

  const filterOptions = useMemo(() => {
    let currentRoutes = ROUTES as Routes;
    let nextRoute: Route | undefined;
    const options: Array<{
      key: string;
      options: Array<SelectListOption<string>>;
    }> = [];

    const addNewOptions = (key: string, routes: Routes) => {
      const handleRemove = () => {
        setCurrentFilter(
          currentFilter && currentFilter.slice(0, currentFilter.indexOf(key))
        );
      };

      const newOptions: Array<SelectListOption<string>> = Object.entries(
        routes
      ).map(([optionKey, value]) => ({
        label: value.name,
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

    for (const chunk of currentFilter ?? []) {
      addNewOptions(chunk, currentRoutes);

      nextRoute = currentRoutes[chunk];
      if (!isRouteWithRoutes(nextRoute)) {
        return options;
      }

      currentRoutes = nextRoute.routes;
    }

    if (
      nextRoute &&
      isRouteWithRoutes(nextRoute) &&
      Object.values(nextRoute.routes).some(isRouteWithRoutes)
    ) {
      addNewOptions(NEXT_FILTER_KEY, nextRoute.routes);
    }
    if (!options.length) {
      addNewOptions(NEXT_FILTER_KEY, currentRoutes);
    }

    return options;
  }, [currentFilter, setCurrentFilter]);

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
    <View>
      <Text style={styles.title}>Searching in:</Text>
      <ScrollView
        contentContainerStyle={styles.content}
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
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
          const showSeparator = index < pathChunkCount;

          return (
            <Fragment key={key}>
              <SelectListDropdown
                options={options}
                renderInput={renderInput}
                selected={key}
                styleOptions={{
                  inputStyle: styles.filterInput,
                  inputTextStyle: styles.filterInputText,
                  chevronColor: colors.primary,
                  dropdownStyle: styles.dropdown,
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

export default memo(SearchFilters);

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  dropdown: {
    minWidth: sizes.xxl,
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
  noFilters: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
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
    marginLeft: spacing.lg,
    marginTop: spacing.xxs,
  },
});
