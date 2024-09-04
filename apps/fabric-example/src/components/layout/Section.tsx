import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Group from './Group';
import { colors, flex, spacing, text } from '../../theme';
import Animated, { LinearTransition } from 'react-native-reanimated';

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
    <Animated.View
      style={[styles.container, fill && flex.fill]}
      layout={LinearTransition}>
      <View style={styles.textWrapper}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Group style={fill && flex.fill}>{children}</Group>
    </Animated.View>
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
    marginBottom: spacing.xs,
  },
  title: {
    ...text.heading3,
    color: colors.foreground1,
  },
});
