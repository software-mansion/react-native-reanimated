import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import type { PropsWithChildren } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, radius, sizes, spacing } from '../../theme';
import { Text } from '../core';

type RouteCardProps = PropsWithChildren<{
  title: string;
  route: string;
  description?: string;
  showcaseScale?: number;
}>;

export type RouteCardComponent = (
  props: Omit<RouteCardProps, 'children'>
) => JSX.Element;

export default function RouteCard({
  children,
  route,
  title,
  description,
  showcaseScale = 1,
}: RouteCardProps) {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      activeOpacity={0.5}
      style={styles.card}
      onPress={() => {
        navigation.navigate(route as never);
      }}>
      <View style={styles.content}>
        <View style={styles.textColumn}>
          <Text variant="label1" style={styles.title}>
            {title}
          </Text>
          {description && <Text variant="body1">{description}</Text>}
        </View>
        {children && (
          <View
            style={[
              styles.showcase,
              { transform: [{ scale: showcaseScale }] },
            ]}>
            {children}
          </View>
        )}
        <FontAwesomeIcon color={colors.foreground3} icon={faChevronRight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  showcase: {
    justifyContent: 'center',
    alignItems: 'center',
    flexBasis: sizes.xl,
    alignSelf: 'stretch',
  },
  textColumn: {
    flexShrink: 1,
    gap: spacing.xxs,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.foreground1,
  },
});
