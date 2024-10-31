import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text } from '@/components/core';
import { colors, radius, spacing } from '@/theme';
import type { FontVariant } from '@/types';

type ButtonSize = 'large' | 'medium' | 'small';

const BUTTON_VARIANTS: Record<
  ButtonSize,
  {
    fontVariant: FontVariant;
    buttonStyle: ViewStyle;
  }
> = {
  large: {
    buttonStyle: {
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    fontVariant: 'label1',
  },
  medium: {
    buttonStyle: {
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    fontVariant: 'label2',
  },
  small: {
    buttonStyle: {
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    fontVariant: 'label3',
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
  activeOpacity = 0.6,
  disabled = false,
  onPress,
  size = 'medium',
  style,
  title,
}: ButtonProps) {
  const { buttonStyle, fontVariant } = BUTTON_VARIANTS[size];

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      disabled={disabled}
      style={[styles.button, style, buttonStyle, disabled && styles.disabled]}
      onPress={onPress}>
      <Text style={styles.text} variant={fontVariant}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
  },
});
