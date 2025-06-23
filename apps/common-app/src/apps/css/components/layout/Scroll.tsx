import { useMemo } from 'react';
import type { ScrollViewProps } from 'react-native';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_HEIGHT } from '@/apps/css/navigation/constants';
import { flex, spacing } from '@/theme';
import { IS_WEB } from '@/utils';

export type ScrollProps = {
  fill?: boolean;
  withBottomBarSpacing?: boolean;
  noPadding?: boolean;
  gap?: number;
  rowGap?: number;
} & Omit<ScrollViewProps, 'gap' | 'rowGap'>;

export default function Scroll({
  children,
  contentContainerStyle,
  fill = false,
  horizontal,
  noPadding = false,
  style,
  withBottomBarSpacing,
  ...rest
}: ScrollProps) {
  const insets = useSafeAreaInsets();

  const inset = Platform.select({
    default: insets.bottom,
    web: spacing.md,
  });

  const flattenedStyle = useMemo(
    () => StyleSheet.flatten(contentContainerStyle),
    [contentContainerStyle]
  );
  const gap = +(flattenedStyle?.gap ?? flattenedStyle?.rowGap ?? spacing.xxs);

  return (
    <ScrollView
      horizontal={horizontal}
      showsVerticalScrollIndicator={false}
      style={[style, fill && flex.fill]}
      contentContainerStyle={[
        IS_WEB && !horizontal && styles.scrollViewContentWeb,
        { gap },
        noPadding
          ? {}
          : {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            },
        contentContainerStyle,
      ]}
      {...rest}>
      {children}
      {withBottomBarSpacing && (
        <View style={{ height: BOTTOM_BAR_HEIGHT + inset - gap }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewContentWeb: {
    marginHorizontal: 'auto',
    maxWidth: '100%',
    width: 600,
  },
});
