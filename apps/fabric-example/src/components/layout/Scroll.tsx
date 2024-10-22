import { ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { flex, spacing } from '../../theme';
import { BOTTOM_BAR_HEIGHT } from '../../navigation/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ScrollProps = ScrollViewProps & {
  fill?: boolean;
  withBottomBarSpacing?: boolean;
};

export default function Scroll({
  fill = true,
  style,
  contentContainerStyle,
  withBottomBarSpacing,
  children,
  ...rest
}: ScrollProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[style, fill && flex.fill]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
});
