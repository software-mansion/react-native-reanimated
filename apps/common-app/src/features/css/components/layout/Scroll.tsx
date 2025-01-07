import type { ScrollViewProps } from 'react-native';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flex, spacing } from '@/theme';
import { IS_WEB } from '@/utils';
import { BOTTOM_BAR_HEIGHT } from '~/css/navigation/constants';

export type ScrollProps = {
  fill?: boolean;
  withBottomBarSpacing?: boolean;
  noPadding?: boolean;
} & ScrollViewProps;

export default function Scroll({
  children,
  contentContainerStyle,
  fill = true,
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

  return (
    <ScrollView
      horizontal={horizontal}
      showsVerticalScrollIndicator={false}
      style={[style, fill && flex.fill]}
      contentContainerStyle={[
        IS_WEB && !horizontal && styles.scrollViewContentWeb,
        { gap: spacing.xxs },
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
        <View style={{ height: BOTTOM_BAR_HEIGHT + inset }} />
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
