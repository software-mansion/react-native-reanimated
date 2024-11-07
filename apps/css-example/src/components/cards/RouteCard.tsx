import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { Text } from '@/components/core';
import { colors, radius, sizes, spacing } from '@/theme';

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
  description,
  route,
  showcaseScale = 1,
  title,
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
          <Text style={styles.title} variant="label1">
            {title}
          </Text>
          {description && <Text variant="body1">{description}</Text>}
        </View>
        <View style={styles.showcaseWrapper}>
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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    gap: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  showcase: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexBasis: sizes.xl,
    justifyContent: 'center',
    minHeight: 110,
  },
  showcaseWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  textColumn: {
    flexShrink: 1,
    gap: spacing.xxs,
    justifyContent: 'space-evenly',
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.foreground1,
  },
});
