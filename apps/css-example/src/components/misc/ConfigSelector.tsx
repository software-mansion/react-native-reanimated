/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable, TouchableOpacity } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  FadeOut,
  isSharedValue,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/core';
import { Checkbox } from '@/components/inputs';
import { Scroll } from '@/components/layout';
import { colors, flex, iconSizes, radius, sizes, spacing } from '@/theme';
import type { AnyRecord } from '@/types';
import { isEasingFunction, isLeafValue, isValidPropertyName } from '@/utils';

import ActionSheetDropdown from './ActionSheetDropdown';

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
  options?: Array<T>;
  canDisable?: boolean;
  disabled?: boolean;
};

export type SelectableConfig<C extends AnyRecord> = {
  [K in keyof C as `$${K & string}`]?: C[K] extends AnyRecord
    ? SelectableConfig<C[K]>
    : SelectableConfigPropertyOptions<C[K]>;
} & {
  [K in keyof C]: C[K] extends AnyRecord ? SelectableConfig<C[K]> : C[K];
};

type ConfigSelectorProps<T extends AnyRecord> = {
  config: SelectableConfig<T>;
  onChange: (config: SelectableConfig<T>) => void;
};

export default function ConfigSelector<T extends AnyRecord>({
  config,
  onChange,
}: ConfigSelectorProps<T>) {
  return (
    <Scroll contentContainerStyle={styles.codeContainer} horizontal>
      <View style={styles.block}>
        <Animated.View layout={LinearTransition}>
          <Text variant="code">{'{'}</Text>
        </Animated.View>
        <View style={{ paddingLeft: spacing.sm }}>
          <Block config={config} onChange={onChange} />
        </View>
        <Animated.View layout={LinearTransition}>
          <Text variant="code">{'},'}</Text>
        </Animated.View>
      </View>
    </Scroll>
  );
}

type BlockProps<T extends AnyRecord> = {
  config: SelectableConfig<T>;
  onChange: (config: SelectableConfig<T>) => void;
};

function Block<T extends AnyRecord>({ config, onChange }: BlockProps<T>) {
  return (
    <Animated.View
      entering={FadeIn}
      // exiting={FadeOut} // TODO - uncomment when layout animations are fixed
      layout={LinearTransition}
      style={[styles.block, { marginLeft: spacing.sm }]}>
      {Object.entries(config).map(([key, value]) => {
        const strippedKey = key.startsWith('$') ? key.slice(1) : key;
        const formattedKey = isValidPropertyName(strippedKey)
          ? strippedKey
          : `"${strippedKey}"`;

        if (key.startsWith('$')) {
          return (
            <SelectableOptionRow
              key={key}
              {...{
                formattedKey,
                onChange: (newValue) =>
                  onChange({ ...config, [key]: newValue }),
                options: value,
              }}
            />
          );
        }

        if (isLeafValue(value)) {
          return (
            <Text key={key} variant="code">
              {formattedKey}:{' '}
              {isEasingFunction(value)
                ? value.toString()
                : JSON.stringify(value)}
            </Text>
          );
        }

        return (
          <CollapsibleBlock
            key={key}
            {...{
              config: value,
              formattedKey,
              onChange: (newValue) => onChange({ ...config, [key]: newValue }),
            }}
          />
        );
      })}
    </Animated.View>
  );
}

type CollapsibleBlockProps = {
  formattedKey: string;
  config: AnyRecord;
  onChange: (config: AnyRecord) => void;
};

function CollapsibleBlock({
  config,
  formattedKey,
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
            <RotatableChevron open={!collapsed} />
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
        <Block config={config} onChange={onChange} />
      )}
      <Animated.View layout={LinearTransition}>
        <Text variant="code">{`},`}</Text>
      </Animated.View>
    </Animated.View>
  );
}

type SelectableOptionRowProps<T> = {
  options: SelectableConfigPropertyOptions<T>;
  formattedKey: string;
  onChange: (newValue: SelectableConfigPropertyOptions<T>) => void;
};

function SelectableOptionRow<T>({
  formattedKey,
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
                onChange({ ...options, disabled: !selected })
              }
            />
          </View>
        )}
        <Pressable
          disabled={!options.canDisable}
          onPress={() => onChange({ ...options, disabled: !isDisabled })}>
          <Text variant="code">{`${formattedKey}: `}</Text>
        </Pressable>
        <View pointerEvents={isDisabled ? 'none' : 'auto'}>
          <OptionSelector<T>
            options={options.options ?? []}
            value={options.value}
            onSelect={(option) => onChange({ ...options, value: option })}
          />
        </View>
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

type OptionSelectorProps<T> = {
  options: Array<T>;
  value: T;
  onSelect: (option: T) => void;
};

function OptionSelector<T>({
  onSelect,
  options,
  value,
}: OptionSelectorProps<T>) {
  const isExpanded = useSharedValue(false);

  const selectedValue = isEasingFunction(value)
    ? value.toString()
    : JSON.stringify(value);

  return (
    <ActionSheetDropdown
      hitSlop={spacing.md}
      options={options.map((option) => ({
        key: isEasingFunction(option)
          ? option.toString()
          : JSON.stringify(option),
        onPress: () => onSelect(option),
        render: () => (
          <View style={styles.option}>
            <Text style={styles.optionText} variant="subHeading3">
              {isEasingFunction(option)
                ? option.toString()
                : JSON.stringify(option)}
            </Text>
          </View>
        ),
      }))}
      styleOptions={{
        dropdownStyle: styles.dropdownStyle,
        fitInScreen: true,
        offsetY: spacing.xs,
      }}
      onClose={() => (isExpanded.value = false)}
      onOpen={() => (isExpanded.value = true)}>
      <View style={styles.selectableOption}>
        <Animated.View
          layout={LinearTransition}
          style={styles.selectedValueBackground}
        />
        <RotatableChevron open={isExpanded} />
        <Animated.View entering={FadeIn} exiting={FadeOut} key={selectedValue}>
          <Text variant="code">{selectedValue}</Text>
        </Animated.View>
      </View>
    </ActionSheetDropdown>
  );
}

type RotatableChevronProps = {
  open: SharedValue<boolean> | boolean;
  openRotation?: number;
};

function RotatableChevron({
  open,
  openRotation = Math.PI,
}: RotatableChevronProps) {
  const progress = useDerivedValue(() =>
    withTiming(isSharedValue<boolean>(open) ? +open.value : +open)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * openRotation}rad` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <FontAwesomeIcon
        color={colors.foreground2}
        icon={faChevronDown}
        size={iconSizes.xxs}
      />
    </Animated.View>
  );
}

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
    alignItems: 'center',
    paddingBottom: spacing.sm,
    paddingHorizontal: 0,
    paddingRight: spacing.sm,
    paddingVertical: 0,
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
  dropdownStyle: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    width: sizes.xxxl,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  optionText: {
    color: colors.foreground2,
  },
  selectableOption: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
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
