import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/core';
import { ActionSheetDropdown } from '@/components/misc';
import { colors, flex, iconSizes, radius, spacing } from '@/theme';

export type SelectListOption<T> = {
  label: string;
  value: T;
};

type SelectListsDropdownProps<T> = {
  options: Array<SelectListOption<T>>;
  selected: T;
  alignment?: 'left' | 'right';
  styleOptions?: {
    dropdownStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<ViewStyle>;
  };
  onSelect: (value: T) => void;
};

export default function SelectListDropdown<T>({
  alignment,
  onSelect,
  options,
  selected,
  styleOptions,
}: SelectListsDropdownProps<T>) {
  const isExpanded = useSharedValue(false);
  const progress = useDerivedValue(() => withTiming(+isExpanded.value));

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const selectedLabel =
    options.find((option) => option.value === selected)?.label ?? '-';

  const dropdownOptions = options.map((option) => ({
    key: option.label,
    onPress: () => onSelect(option.value),
    render: () => (
      <DropdownOption
        label={option.label}
        selected={option.value === selected}
      />
    ),
  }));

  return (
    <ActionSheetDropdown
      options={dropdownOptions}
      styleOptions={{
        alignment,
        dropdownStyle: [styles.dropdown, styleOptions?.dropdownStyle],
      }}
      onClose={() => (isExpanded.value = false)}
      onOpen={() => (isExpanded.value = true)}>
      <View style={[styles.input, styleOptions?.inputStyle]}>
        <Text numberOfLines={1} style={flex.shrink} variant="subHeading3">
          {selectedLabel}
        </Text>
        <Animated.View style={animatedArrowStyle}>
          <FontAwesomeIcon
            color={colors.foreground2}
            icon={faChevronDown}
            size={iconSizes.xs}
          />
        </Animated.View>
      </View>
    </ActionSheetDropdown>
  );
}

type DropdownOptionProps = {
  label: string;
  selected: boolean;
  style?: StyleProp<ViewStyle>;
};

function DropdownOption({ label, selected, style }: DropdownOptionProps) {
  return (
    <View style={[styles.option, style]}>
      <Text
        style={[styles.optionText, selected && styles.selectedOptionText]}
        variant="subHeading3">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
  },
  input: {
    alignItems: 'center',
    backgroundColor: colors.background2,
    borderColor: colors.background3,
    borderRadius: radius.xs,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  optionText: {
    color: colors.foreground2,
  },
  selectedOptionText: {
    color: colors.primary,
  },
});
