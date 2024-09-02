import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Group from './Group';
import { colors, flex, spacing, text } from '../../theme';

type SectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  fill?: boolean;
}>;

export default function Section({
  children,
  description,
  fill,
  title,
}: SectionProps) {
  return (
    <View style={[styles.container, fill && flex.fill]}>
      <View style={styles.textWrapper}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Group style={fill && flex.fill}>{children}</Group>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
    marginTop: spacing.md,
  },
  description: {
    ...text.body1,
    color: colors.foreground3,
  },
  textWrapper: {
    gap: spacing.xs,
    marginHorizontal: spacing.sm,
  },
  title: {
    ...text.subHeading2,
    color: colors.foreground1,
  },
});
