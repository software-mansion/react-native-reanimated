import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import Text from '../core/Text';

export type LabelType =
  | 'Android'
  | 'iOS'
  | 'needsFix'
  | 'new'
  | 'unimplemented'
  | 'unsupported'
  | 'web';

const labelTexts = {
  Android: 'Android',
  iOS: 'iOS',
  needsFix: 'Needs Fix',
  new: 'New',
  unimplemented: 'Unimplemented',
  unsupported: 'Unsupported',
  web: 'Web',
} satisfies Record<LabelType, string>;

const variants = {
  large: {
    labelStyle: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    text: 'label1',
  },
  medium: {
    labelStyle: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    text: 'label2',
  },
  small: {
    labelStyle: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
    },
    text: 'label3',
  },
} as const;

type LabelProps = {
  type: LabelType;
  size?: 'large' | 'medium' | 'small';
};

export default function Label({ size = 'small', type }: LabelProps) {
  const variant = variants[size];
  const color = colors.label[type];

  if (!color || !variant) {
    return null;
  }

  return (
    <View style={[styles.label, variant.labelStyle, { borderColor: color }]}>
      <View style={[styles.background, { backgroundColor: color }]} />
      <Text style={{ color }} variant={variant.text}>
        {labelTexts[type]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  label: {
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
