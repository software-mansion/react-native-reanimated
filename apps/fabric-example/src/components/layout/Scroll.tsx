import type { ScrollViewProps } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_HEIGHT } from '@/navigation';
import { flex, spacing } from '@/theme';

export type ScrollProps = {
  fill?: boolean;
  withBottomBarSpacing?: boolean;
} & ScrollViewProps;

export default function Scroll({
  children,
  contentContainerStyle,
  fill = true,
  style,
  withBottomBarSpacing,
  ...rest
}: ScrollProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      style={[style, fill && flex.fill]}
      {...rest}>
      {children}
      {withBottomBarSpacing && (
        <View style={{ height: BOTTOM_BAR_HEIGHT + insets.bottom }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
