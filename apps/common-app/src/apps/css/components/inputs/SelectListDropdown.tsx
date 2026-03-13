import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { colors, flex, radius, spacing } from '@/theme';

import Text from '../core/Text';
import ActionSheetDropdown from '../misc/ActionSheetDropdown';
import RotatableChevron from '../misc/RotatableChevron';

export type SelectListOption<T> =
  | {
      key: string;
      label: ReactNode;
      value: T;
    }
  | {
      key?: string;
      label: string;
      value: T;
    };

type SelectListsDropdownProps<T> = {
  options: Array<SelectListOption<T>>;
  selected: T;
  fitInScreen?: boolean;
  alignment?: 'left' | 'right';
  styleOptions?: {
    dropdownStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<ViewStyle>;
    inputTextStyle?: StyleProp<TextStyle>;
    chevronColor?: string;
  };
  formatInputLabel?: (selected?: SelectListOption<T>) => string | undefined;
  renderInput?: (selected?: SelectListOption<T>) => ReactNode;
  onSelect: (value: T) => void;
};

export default function SelectListDropdown<T>({
  alignment,
  fitInScreen,
  formatInputLabel,
  onSelect,
  options,
  renderInput,
  selected,
  styleOptions,
}: SelectListsDropdownProps<T>) {
  const isExpanded = useSharedValue(false);

  const selectedOption = options.find((option) => option.value === selected);
  const inputLabel =
    formatInputLabel?.(selectedOption) ?? selectedOption?.label ?? '-';

  const dropdownOptions = options.map((option) => ({
    key: (option.key ?? option.label) as string,
    onPress: () => onSelect(option.value),
    render: () => (
      <DropdownOption
        label={option.label}
        selected={option.value === selected}
      />
    ),
  }));

  const input = renderInput?.(selectedOption) ?? (
    <View style={[styles.input, styleOptions?.inputStyle]}>
      <Text
        numberOfLines={1}
        style={[flex.shrink, styleOptions?.inputTextStyle]}
        variant="subHeading3">
        {inputLabel}
      </Text>
      <RotatableChevron
        color={styleOptions?.chevronColor ?? colors.foreground2}
        open={isExpanded}
      />
    </View>
  );

  return (
    <ActionSheetDropdown
      fitInScreen={fitInScreen}
      options={dropdownOptions}
      styleOptions={{
        alignment,
        dropdownStyle: [styles.dropdown, styleOptions?.dropdownStyle],
      }}
      onClose={() => (isExpanded.value = false)}
      onOpen={() => (isExpanded.value = true)}>
      {input}
    </ActionSheetDropdown>
  );
}

type DropdownOptionProps = {
  label: ReactNode;
  selected: boolean;
  style?: StyleProp<ViewStyle>;
};

function DropdownOption({ label, selected, style }: DropdownOptionProps) {
  return (
    <View style={[styles.option, style]}>
      {typeof label === 'string' ? (
        <Text
          style={[styles.optionText, selected && styles.selectedOptionText]}
          variant="subHeading3">
          {label}
        </Text>
      ) : (
        label
      )}
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
