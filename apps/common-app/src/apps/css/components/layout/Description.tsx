import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Text } from '../core';

type DescriptionProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export default function Description({ children, style }: DescriptionProps) {
  return Array.isArray(children) ? (
    <View style={[styles.description, style]}>
      {children.map((paragraph, index) => {
        return (
          <Text key={index} style={!paragraph && { lineHeight: 1 }}>
            {paragraph}
          </Text>
        );
      })}
    </View>
  ) : (
    <Text style={[styles.description, style]}>{children}</Text>
  );
}
const styles = StyleSheet.create({
  description: {
    gap: spacing.xs,
  },
});
