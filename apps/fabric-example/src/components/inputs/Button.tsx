import { StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { Text } from '../core';

type ButtonProps = {
  title: string;
  onPress: () => void;
  activeOpacity?: number;
  disabled?: boolean;
};

export default function Button({
  title,
  onPress,
  activeOpacity = 0.6,
  disabled = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={activeOpacity}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}>
      <Text variant="label2" style={styles.text}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
  },
});
