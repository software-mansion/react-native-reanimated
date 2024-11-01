import type { ScrollViewProps } from 'react-native';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_HEIGHT } from '@/navigation';
import { flex, spacing } from '@/theme';

export type ScrollProps = {
  fill?: boolean;
  withBottomBarSpacing?: boolean;
  noPadding?: boolean;
} & ScrollViewProps;

export default function Scroll({
  children,
  contentContainerStyle,
  fill = true,
  noPadding = false,
  style,
  withBottomBarSpacing,
  ...rest
}: ScrollProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[style, fill && flex.fill]}
      contentContainerStyle={[
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
        <View
          style={{
            height: BOTTOM_BAR_HEIGHT + insets.bottom,
          }}
        />
      )}
    </ScrollView>
  );
}
