import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { Text } from '../core';
import type { FontVariant } from '../../types';

type ButtonSize = 'small' | 'medium' | 'large';

const BUTTON_VARIANTS: Record<
  ButtonSize,
  {
    fontVariant: FontVariant;
    buttonStyle: ViewStyle;
  }
> = {
  small: {
    fontVariant: 'label3',
    buttonStyle: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.sm,
    },
  },
  medium: {
    fontVariant: 'label2',
    buttonStyle: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
    },
  },
  large: {
    fontVariant: 'label1',
    buttonStyle: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
    },
  },
};

type ButtonProps = {
  title: string;
  size?: ButtonSize;
  activeOpacity?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
};

export default function Button({
  title,
  onPress,
  style,
  size = 'medium',
  activeOpacity = 0.6,
  disabled = false,
}: ButtonProps) {
  const { fontVariant, buttonStyle } = BUTTON_VARIANTS[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={activeOpacity}
      disabled={disabled}
      style={[styles.button, style, buttonStyle, disabled && styles.disabled]}>
      <Text variant={fontVariant} style={styles.text}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
  },
});
