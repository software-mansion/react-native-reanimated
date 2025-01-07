import type { PropsWithChildren, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { flex, spacing } from '@/theme';

import Text from '../core/Text';
import type { LabelType } from '../misc/Label';
import Label from '../misc/Label';
import Group from './Group';

type SectionProps = PropsWithChildren<{
  title: string;
  labelTypes?: Array<LabelType>;
  description?: ReactNode;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  groupStyle?: StyleProp<ViewStyle>;
}>;

export function Section({
  children,
  description,
  fill,
  labelTypes,
  style,
  title,
}: SectionProps) {
  return (
    <Animated.View
      layout={LinearTransition}
      style={[styles.sectionContainer, style, fill && flex.fill]}>
      <View style={styles.textWrapper}>
        <View style={styles.titleWrapper}>
          <Text variant="heading3">{title}</Text>
          {labelTypes?.map((labelType, index) => (
            <Label key={index} type={labelType} />
          ))}
        </View>
        {description &&
          (Array.isArray(description) ? (
            <View style={styles.description}>
              {description.map((paragraph, index) => (
                <Text key={index}>{paragraph}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.description}>{description}</Text>
          ))}
      </View>
      <Group style={[styles.sectionContent, fill && flex.fill]}>
        {children}
      </Group>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  description: {
    gap: spacing.xs,
  },
  sectionContainer: {
    gap: spacing.xxs,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  sectionContent: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  textWrapper: {
    gap: spacing.xs,
    marginHorizontal: spacing.sm,
  },
  titleWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
});
