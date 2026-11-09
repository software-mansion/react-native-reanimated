import { useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useLayoutEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SharedTransitionBoundary } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from './theme';

export function ScreenBoundary({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      {children}
    </SharedTransitionBoundary>
  );
}

export function useHiddenAppHeader() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);
}

const ICON_PATHS = {
  back: 'M15 5 8 12l7 7',
  close: 'M6 6l12 12M18 6 6 18',
  bag: 'M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  star: 'M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9 12 4Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
};

export type IconName = keyof typeof ICON_PATHS;

export function Icon({
  name,
  size = 22,
  color = colors.navy,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={ICON_PATHS[name]}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function RoundButton({
  icon,
  onPress,
  style,
  color = colors.navy,
  background = colors.white,
}: {
  icon: IconName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
  background?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.roundButton, { backgroundColor: background }, style]}>
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

export function Stars({ rating = 4.9 }: { rating?: number }) {
  return (
    <View style={styles.stars}>
      <Icon name="star" size={15} color={colors.yellow} filled />
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
    </View>
  );
}

export function NoteChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.primaryButton, style]}>
      <Icon name="bag" color={colors.white} size={20} />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.navy,
  },
  primaryButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.white,
  },
});
