import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { colors, iconSizes, radius, spacing } from '../../theme';
import { Text } from '../core';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ActionSheetDropdown } from '../misc';

export type SelectListOption<T> = {
  label: string;
  value: T;
};

type SelectListsDropdownProps<T> = {
  options: SelectListOption<T>[];
  selected: T;
  alignment?: 'left' | 'right';
  styleOptions?: {
    dropdownStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<ViewStyle>;
  };
  onSelect: (value: T) => void;
};

export default function SelectListDropdown<T>({
  options,
  selected,
  alignment,
  styleOptions,
  onSelect,
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
      styleOptions={{
        alignment,
        dropdownStyle: [styles.dropdown, styleOptions?.dropdownStyle],
      }}
      options={dropdownOptions}
      onOpen={() => (isExpanded.value = true)}
      onClose={() => (isExpanded.value = false)}>
      <View style={[styles.input, styleOptions?.inputStyle]}>
        <Text variant="subHeading3">{selectedLabel}</Text>
        <Animated.View style={animatedArrowStyle}>
          <FontAwesomeIcon
            icon={faChevronDown}
            color={colors.foreground2}
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
        variant="subHeading3"
        style={[styles.optionText, selected && styles.selectedOptionText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.background2,
    borderColor: colors.background3,
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
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
