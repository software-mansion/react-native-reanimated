import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { colors, flex, radius, spacing } from '@/theme';

import Text from '../core/Text';
import ActionSheetDropdown from '../misc/ActionSheetDropdown';
import RotatableChevron from '../misc/RotatableChevron';

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
        <RotatableChevron color={colors.foreground2} open={isExpanded} />
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
