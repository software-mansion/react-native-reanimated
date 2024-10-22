import type { PropsWithChildren, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import Group from './Group';
import { colors, flex, spacing } from '../../theme';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Text } from '../core';

type SectionProps = PropsWithChildren<{
  title: string;
  description?: ReactNode;
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
        <Text variant="heading3">{title}</Text>
        {description && <Text>{description}</Text>}
      </View>
      <Group style={[styles.sectionContent, fill && flex.fill]}>
        {children}
      </Group>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    gap: spacing.xxs,
    marginTop: spacing.md,
    overflow: 'hidden',
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
  textWrapper: {
    gap: spacing.xs,
    marginHorizontal: spacing.sm,
  },
});
