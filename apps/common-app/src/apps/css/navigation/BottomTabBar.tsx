import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { scheduleOnUI } from 'react-native-worklets';

import { BOTTOM_BAR_HEIGHT } from '@/apps/css/navigation/constants';
import type { TabRoute } from '@/apps/css/navigation/types';
import { colors, flex, spacing, text } from '@/theme';

import { useLocalNavigationRef } from './LocalNavigationProvider';

const TABS_GAP = spacing.xxs;

type BottomTabBarProps = {
  routes: Array<TabRoute>;
  currentRoute: SharedValue<string | undefined>;
};

export default function BottomTabBar({
  currentRoute,
  routes,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const navigationRef = useLocalNavigationRef();

  const buttonWidths = useSharedValue<Array<number>>([]);
  const currentRouteIndex = useDerivedValue(() =>
    routes.findIndex(({ name }) => currentRoute.value?.startsWith(name))
  );

  const activeIndicatorStyle = useAnimatedStyle(() => {
    let offset = 0;
    for (let i = 0; i < currentRouteIndex.value; i++) {
      offset += TABS_GAP + (buttonWidths.value[i] ?? 0);
    }

    const width = buttonWidths.value[currentRouteIndex.value];
    if (!width) {
      return {};
    }

    return {
      left: withTiming(offset),
      width: withTiming(width),
    };
  }, []);

  const gradient = useMemo(
    () => (
      <Svg height="100%" width="100%">
        {/* TODO: Fix me */}
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801 */}
        <Defs>
          <LinearGradient id="bottom-tab-bar" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.black} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.black} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>
        <Rect
          fill="url(#bottom-tab-bar)"
          height="100%"
          width="100%"
          x="0"
          y="0"
        />
      </Svg>
    ),
    []
  );

  const handleMeasure = useCallback(
    (width: number, idx: number) => {
      scheduleOnUI(() => {
        buttonWidths.value[idx] = width;
        buttonWidths.value = [...buttonWidths.value];
      });
    },
    [buttonWidths]
  );

  const inset = Platform.select({
    default: insets.bottom,
    web: spacing.md,
  });

  return (
    <View style={[styles.wrapper, { height: BOTTOM_BAR_HEIGHT + inset }]}>
      <View style={StyleSheet.absoluteFill}>{gradient}</View>
      <View style={styles.container}>
        <View style={[flex.row, { gap: TABS_GAP }]}>
          <Animated.View
            style={[styles.activeIndicator, activeIndicatorStyle]}
          />
          {routes.map(({ icon, name }, idx) => (
            <RouteButton
              currentRoute={currentRoute}
              icon={icon}
              iconPosition={idx < routes.length / 2 ? 'left' : 'right'}
              key={name}
              name={name}
              onMeasure={(width) => handleMeasure(width, idx)}
              onPress={() => {
                navigationRef.current?.reset({
                  routes: [{ name: name as never }],
                });
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

type RouteButtonProps = {
  iconPosition: 'left' | 'right';
  name: string;
  icon: IconDefinition;
  currentRoute: SharedValue<string | undefined>;
  onPress: () => void;
  onMeasure: (width: number) => void;
};

function RouteButton({
  currentRoute,
  icon,
  iconPosition,
  name,
  onMeasure,
  onPress,
}: RouteButtonProps) {
  const leftIcon = iconPosition === 'left';
  const rightIcon = iconPosition === 'right';

  const isActive = useDerivedValue(() => currentRoute.value?.includes(name));
  const activationProgress = useDerivedValue<number>(() =>
    withTiming(isActive.value ? 1 : 0)
  );

  const animatedColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activationProgress.value,
      [0, 1],
      [colors.foreground1, colors.background1]
    ),
  }));

  const iconComponent = (
    <AnimatedIcon activationProgress={activationProgress} icon={icon} />
  );

  return (
    <Pressable
      style={styles.routeButton}
      onPress={onPress}
      onLayout={({
        nativeEvent: {
          layout: { width },
        },
      }) => onMeasure(width)}>
      {leftIcon && iconComponent}
      <Animated.Text
        numberOfLines={1}
        style={[text.label1, animatedColorStyle]}>
        {name}
      </Animated.Text>
      {rightIcon && iconComponent}
    </Pressable>
  );
}

type AnimatedIconProps = {
  icon: IconDefinition;
  activationProgress: SharedValue<number>;
};

function AnimatedIcon({ activationProgress, icon }: AnimatedIconProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: activationProgress.value,
  }));

  return (
    <View>
      <FontAwesomeIcon color={colors.foreground1} icon={icon} />
      <Animated.View style={[styles.iconOverlay, animatedStyle]}>
        <FontAwesomeIcon color={colors.background1} icon={icon} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeIndicator: {
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
    height: '100%',
    position: 'absolute',
  },
  container: {
    backgroundColor: colors.background1,
    borderRadius: spacing.md,
    flexDirection: 'row',
    gap: spacing.xxs,
    marginBottom: spacing.xxs,
    marginHorizontal: spacing.md,
    padding: spacing.xs,
  },
  iconOverlay: {
    position: 'absolute',
  },
  routeButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    padding: spacing.xs,
  },
  wrapper: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'flex-start',
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
