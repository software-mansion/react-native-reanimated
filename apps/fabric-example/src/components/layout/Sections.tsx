import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import Group from './Group';
import { colors, flex, spacing, text } from '../../theme';
import Animated, { LinearTransition } from 'react-native-reanimated';

type SectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  groupStyle?: StyleProp<ViewStyle>;
}>;

export function Section({
  children,
  description,
  fill,
  title,
  style,
}: SectionProps) {
  return (
    <Animated.View
      style={[styles.sectionContainer, style, fill && flex.fill]}
      layout={LinearTransition}>
      <View style={styles.textWrapper}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Group style={[styles.sectionContent, fill && flex.fill]}>
        {children}
      </Group>
    </Animated.View>
  );
}

export function SubSection({
  children,
  description,
  fill,
  title,
  style,
}: SectionProps) {
  return (
    <Animated.View
      style={[styles.subSectionContainer, style, fill && flex.fill]}
      layout={LinearTransition}>
      <View style={styles.textWrapper}>
        <Text style={styles.subSectionTitle}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Group style={[styles.subSectionContent, fill && flex.fill]}>
        {children}
      </Group>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    gap: spacing.xxs,
    marginTop: spacing.md,
  },
  subSectionContainer: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  sectionContent: {
    marginTop: spacing.sm,
  },
  subSectionContent: {
    backgroundColor: colors.background2,
    padding: spacing.xs,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xxs,
  },
  description: {
    ...text.body1,
    color: colors.foreground3,
  },
  textWrapper: {
    gap: spacing.xs,
    marginHorizontal: spacing.sm,
  },
  sectionTitle: {
    ...text.heading3,
    color: colors.foreground1,
  },
  subSectionTitle: {
    ...text.subHeading2,
    color: colors.foreground1,
  },
});
