import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

type GroupProps = PropsWithChildren<{
  bordered?: boolean;
  center?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export default function Group({
  bordered,
  center,
  children,
  style,
}: GroupProps) {
  return (
    <Animated.View
      layout={LinearTransition}
      style={[
        styles.group,
        bordered && styles.bordered,
        center && styles.center,
        style,
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bordered: {
    borderColor: colors.foreground3,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
});
