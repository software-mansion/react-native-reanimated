/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React, { memo, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Pressable, TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useStableCallback } from '@/hooks';
import { colors, flex, radius, sizes, spacing } from '@/theme';
import type { AnyRecord, UnpackArray } from '@/types';
import { deepEqual, typedMemo } from '@/utils';
import {
  formatLeafValue,
  isEasingFunction,
  isLeafValue,
  isValidPropertyName,
} from '~/css/utils';

import Text from '../core/Text';
import Checkbox from '../inputs/Checkbox';
import Scroll from '../layout/Scroll';
import ActionSheetDropdown from './ActionSheetDropdown';
import RotatableChevron from './RotatableChevron';

const convertSelectableConfigToConfig = <T extends AnyRecord>(
  config: SelectableConfig<T>
): T => {
  const convertedConfig: AnyRecord = {};

  for (const [key, value] of Object.entries(config)) {
    if (key.startsWith('$')) {
      const options = value as SelectableConfigPropertyOptions<T>;
      if (!options.disabled) {
        convertedConfig[key.slice(1)] = options.value;
      }
    } else if (isLeafValue(value)) {
      convertedConfig[key] = value;
    } else {
      convertedConfig[key] = convertSelectableConfigToConfig(
        value as AnyRecord
      );
    }
  }

  return convertedConfig as T;
};

export function useSelectableConfig<T extends AnyRecord>(
  config: SelectableConfig<T>
): T {
  return useMemo(() => convertSelectableConfigToConfig(config), [config]);
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export type SelectableConfigPropertyOptions<T> = {
  value: T;
  canDisable?: boolean;
  disabled?: boolean;
} & (
  | {
      maxNumberOfValues?: never;
      options: Array<T>;
    }
  | { maxNumberOfValues: number; options: Array<UnpackArray<T>> }
);

export type SelectableConfig<C extends AnyRecord> = {
  [K in keyof C as `$${K & string}`]?: C[K] extends AnyRecord
    ? SelectableConfig<C[K]>
    : SelectableConfigPropertyOptions<C[K]>;
} & {
  [K in keyof C]: C[K] extends infer U
    ? U extends AnyRecord
      ? SelectableConfig<U>
      : C[K]
    : never;
};

type ConfigSelectorProps<T extends AnyRecord> = {
  onChange: (config: T) => void;
} & Omit<BlockProps<T>, 'objectKey' | 'onChange'>;

function ConfigSelector<T extends AnyRecord>({
  onChange,
  ...props
}: ConfigSelectorProps<T>) {
  const addAdditionalIndent = Object.entries(props.config).some(
    ([key, value]) =>
      key.startsWith('$') &&
      (value as SelectableConfigPropertyOptions<T>).canDisable
  );

  return (
    <View style={styles.configSelectorWrapper}>
      <Scroll contentContainerStyle={styles.codeContainer} horizontal>
        <View style={styles.block}>
          <Animated.View layout={LinearTransition}>
            <Text variant="code">{'{'}</Text>
          </Animated.View>
          <View style={{ paddingLeft: addAdditionalIndent ? spacing.md : 0 }}>
            <Block
              {...props}
              objectKey=""
              onChange={(_, newConfig) => onChange(newConfig as T)}
            />
          </View>
          <Animated.View layout={LinearTransition}>
            <Text variant="code">{'}'}</Text>
          </Animated.View>
        </View>
      </Scroll>
    </View>
  );
}

type BlockProps<T extends AnyRecord> = {
  config: SelectableConfig<T>;
  objectKey: string;
  dropdownStyle?: StyleProp<ViewStyle>;
  blockStyle?: StyleProp<ViewStyle>;
  onChange: (key: string, config: AnyRecord) => void;
};

const Block = typedMemo(function Block<T extends AnyRecord>({
  blockStyle,
  config,
  dropdownStyle,
  objectKey,
  onChange,
}: BlockProps<T>) {
  const stableOnChange = useStableCallback(
    (key: string, newValue: AnyRecord) => {
      onChange(objectKey, { ...config, [key]: newValue });
    }
  );

  return (
    <Animated.View
      entering={FadeIn}
      // exiting={FadeOut} // TODO - uncomment when layout animations are fixed
      layout={LinearTransition}
      style={[styles.block, { marginLeft: spacing.sm }, blockStyle]}>
      {Object.entries(config).map(([key, value]) => {
        const strippedKey = key.startsWith('$') ? key.slice(1) : key;
        const formattedKey = isValidPropertyName(strippedKey)
          ? strippedKey
          : `"${strippedKey}"`;

        if (key.startsWith('$')) {
          return (
            <SelectableOptionRow
              dropdownStyle={dropdownStyle}
              formattedKey={formattedKey}
              key={key}
              objectKey={key}
              options={value}
              onChange={stableOnChange}
            />
          );
        }

        if (isLeafValue(value)) {
          return (
            <Text key={key} variant="code">
              {formattedKey}: {formatLeafValue(value, '  ', true)},
            </Text>
          );
        }

        return (
          <CollapsibleBlock
            config={value}
            formattedKey={formattedKey}
            key={key}
            objectKey={key}
            onChange={stableOnChange}
          />
        );
      })}
    </Animated.View>
  );
});

type CollapsibleBlockProps = {
  formattedKey: string;
  config: AnyRecord;
  objectKey: string;
  onChange: (key: string, config: AnyRecord) => void;
};

const CollapsibleBlock = memo(function CollapsibleBlock({
  config,
  formattedKey,
  objectKey,
  onChange,
}: CollapsibleBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Animated.View
      layout={LinearTransition}
      style={[styles.block, { flexDirection: collapsed ? 'row' : 'column' }]}>
      <View style={flex.row}>
        <View style={styles.collapseButton}>
          <Pressable
            hitSlop={spacing.xxs}
            onPress={() => setCollapsed(!collapsed)}>
            <RotatableChevron color={colors.foreground1} open={!collapsed} />
          </Pressable>
        </View>
        <Pressable onPress={() => setCollapsed(!collapsed)}>
          <Text variant="code">{`${formattedKey}: {`}</Text>
        </Pressable>
      </View>
      {collapsed ? (
        <AnimatedTouchableOpacity
          entering={FadeIn}
          style={styles.collapsedCodeDotsButton}
          onPress={() => setCollapsed(false)}>
          <Text variant="code">...</Text>
        </AnimatedTouchableOpacity>
      ) : (
        <Block config={config} objectKey={objectKey} onChange={onChange} />
      )}
      <Animated.View layout={LinearTransition}>
        <Text variant="code">{`},`}</Text>
      </Animated.View>
    </Animated.View>
  );
});

type SelectableOptionRowProps<T> = {
  options: SelectableConfigPropertyOptions<T>;
  formattedKey: string;
  objectKey: string;
  dropdownStyle?: StyleProp<ViewStyle>;
  onChange: (key: string, config: AnyRecord) => void;
};

const SelectableOptionRow = memo(function SelectableOptionRow<T>({
  dropdownStyle,
  formattedKey,
  objectKey,
  onChange,
  options,
}: SelectableOptionRowProps<T>) {
  const isDisabled = options.disabled ?? false;

  const animatedOpacityStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isDisabled ? 0.5 : 1),
  }));

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <Animated.View
        layout={LinearTransition}
        style={[flex.row, animatedOpacityStyle]}>
        {options.canDisable && (
          <View style={styles.checkboxWrapper}>
            <Checkbox
              selected={!isDisabled}
              onChange={(selected) =>
                onChange(objectKey, { ...options, disabled: !selected })
              }
            />
          </View>
        )}

        <Pressable
          disabled={!options.canDisable}
          onPress={() =>
            onChange(objectKey, { ...options, disabled: !isDisabled })
          }>
          <Text variant="code">{`${formattedKey}: `}</Text>
        </Pressable>

        <View pointerEvents={isDisabled ? 'none' : 'auto'}>
          <View style={styles.multipleOptionsRow}>
            {options.maxNumberOfValues ? (
              <>
                <Text variant="code">[</Text>
                {Array.from({ length: options.maxNumberOfValues }).map(
                  (_, index) =>
                    (
                      Array.isArray(options.value)
                        ? index > 0 &&
                          options.value[index] === undefined &&
                          options.value[index - 1] === undefined
                        : index > 1
                    ) ? null : (
                      <MultipleOptionsOptionSelector
                        dropdownStyle={dropdownStyle}
                        index={index}
                        key={index}
                        objectKey={objectKey}
                        options={options}
                        onChange={onChange}
                      />
                    )
                )}
                <Text variant="code">],</Text>
              </>
            ) : (
              <>
                <OptionSelector
                  dropdownStyle={dropdownStyle}
                  options={options.options as Array<T>}
                  value={options.value}
                  onSelect={(option) => {
                    onChange(objectKey, { ...options, value: option! });
                  }}
                />
                <Text variant="code">,</Text>
              </>
            )}
          </View>
        </View>
      </Animated.View>
    </LayoutAnimationConfig>
  );
});

type MultipleOptionsOptionSelectorProps<T> = {
  index: number;
  dropdownStyle?: StyleProp<ViewStyle>;
  options: SelectableConfigPropertyOptions<T>;
  objectKey: string;
  onChange: (key: string, config: AnyRecord) => void;
};

const MultipleOptionsOptionSelector = typedMemo(
  function MultipleOptionsOptionSelector<T>({
    dropdownStyle,
    index,
    objectKey,
    onChange,
    options,
  }: MultipleOptionsOptionSelectorProps<T>) {
    const selectedValue = Array.isArray(options.value)
      ? options.value[index]
      : index === 0
        ? options.value
        : undefined;

    const stableOnSelect = useStableCallback((option: T | undefined) => {
      if (!Array.isArray(options.value)) {
        onChange(objectKey, {
          ...options,
          value: index === 0 ? option! : [options.value, option!],
        });
        return;
      }

      const newValue = [...options.value];
      if (option === undefined) {
        const filtered = options.value.filter((_, i) => i !== index);
        onChange(objectKey, {
          ...options,
          value: filtered.length === 1 ? filtered[0] : filtered,
        });
      } else {
        newValue[index] = option;
        onChange(objectKey, { ...options, value: newValue });
      }
    });

    return (
      <View style={styles.multipleOptionsEntry}>
        {index > 0 && <Text variant="code">, </Text>}
        <OptionSelector
          dropdownStyle={dropdownStyle}
          options={options.options as Array<T>}
          value={selectedValue}
          canBeRemoved={
            Array.isArray(options.value) && options.value.length > 1
          }
          onSelect={stableOnSelect}
        />
      </View>
    );
  }
);

type OptionSelectorProps<T> = {
  options: Array<T>;
  value: T;
  dropdownStyle?: StyleProp<ViewStyle>;
  canBeRemoved?: boolean;
  onSelect: (option: T | undefined) => void;
};

const OptionSelector = typedMemo(function OptionSelector<T>({
  canBeRemoved,
  dropdownStyle,
  onSelect,
  options,
  value,
}: OptionSelectorProps<T>) {
  const isExpanded = useSharedValue(false);
  const isRemoved = value === undefined;

  const selectedValue = formatLeafValue(value, '', true);
  const mappedOptions = options.map((option) => ({
    key: isEasingFunction(option) ? option.toString() : JSON.stringify(option),
    onPress: () => onSelect(option),
    render: () => (
      <View style={styles.option}>
        <Text
          variant="subHeading3"
          style={[
            styles.optionText,
            deepEqual(value, option) ? styles.selectedOptionText : null,
          ]}>
          {formatLeafValue(option, '', true)}
        </Text>
      </View>
    ),
  }));

  if (!isRemoved && canBeRemoved) {
    mappedOptions.push({
      key: '-',
      onPress: () => onSelect(undefined),
      render: () => (
        <View style={styles.option}>
          <Text
            style={[styles.optionText, { color: colors.danger }]}
            variant="subHeading3">
            Remove
          </Text>
        </View>
      ),
    });
  }

  return (
    <ActionSheetDropdown
      options={mappedOptions}
      styleOptions={{
        dropdownStyle: [styles.dropdownStyle, dropdownStyle],
        fitInScreen: true,
        offsetY: spacing.xs,
      }}
      onClose={() => (isExpanded.value = false)}
      onOpen={() => (isExpanded.value = true)}>
      <View style={styles.selectableOption}>
        <Animated.View
          style={[
            styles.selectedValueBackground,
            isRemoved && styles.removedValueBackground,
          ]}
        />
        <RotatableChevron
          color={isRemoved ? colors.foreground3 : colors.foreground1}
          open={isExpanded}
        />
        <Text variant="code">{selectedValue}</Text>
      </View>
    </ActionSheetDropdown>
  );
});

export default typedMemo(ConfigSelector);

const styles = StyleSheet.create({
  block: {
    gap: 1,
  },
  checkboxWrapper: {
    paddingRight: spacing.xxs,
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: '-50%' }, { translateX: '-100%' }],
  },
  codeContainer: {
    paddingBottom: spacing.sm,
  },
  collapseButton: {
    paddingRight: spacing.xxxs,
    position: 'absolute',
    right: '100%',
    top: '50%',
    transform: [{ translateY: '-50%' }],
  },
  collapsedCodeDotsButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xs,
  },
  configSelectorWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
  },
  dropdownStyle: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    maxWidth: sizes.xxxl,
    paddingVertical: spacing.xs,
  },
  multipleOptionsEntry: {
    flexDirection: 'row',
    gap: spacing.xxxs,
  },
  multipleOptionsRow: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  optionText: {
    color: colors.foreground2,
  },
  removedValueBackground: {
    backgroundColor: colors.background3,
    borderColor: colors.background3,
  },
  selectableOption: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  selectedOptionText: {
    color: colors.primary,
  },
  selectedValueBackground: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: radius.xs,
    borderWidth: 1,
    bottom: -spacing.xxxs,
    left: -spacing.xxs,
    position: 'absolute',
    right: -spacing.xxs,
    top: -spacing.xxxs,
  },
});
