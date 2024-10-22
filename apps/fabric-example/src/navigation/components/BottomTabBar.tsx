import { Pressable, StyleSheet, View } from 'react-native';
import { colors, flex, spacing } from '../../theme';
import { useCallback, useMemo } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BOTTOM_BAR_HEIGHT } from '../constants';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { TabRoute } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  interpolateColor,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '../../components';

const TABS_GAP = spacing.xxs;

type BottomTabBarProps = {
  routes: TabRoute[];
  currentRoute: SharedValue<string | undefined>;
};

export default function BottomTabBar({
  routes,
  currentRoute,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const buttonWidths = useSharedValue<number[]>([]);
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
      width: withTiming(width),
      left: withTiming(offset),
    };
  }, []);

  const gradient = useMemo(
    () => (
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.black} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.black} stopOpacity="0.15" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradient)" />
      </Svg>
    ),
    []
  );

  const handleMeasure = useCallback(
    (width: number, idx: number) => {
      runOnUI(() => {
        buttonWidths.value[idx] = width;
        buttonWidths.value = [...buttonWidths.value];
      })();
    },
    [buttonWidths]
  );

  return (
    <View
      style={[styles.wrapper, { height: BOTTOM_BAR_HEIGHT + insets.bottom }]}>
      <View style={StyleSheet.absoluteFill}>{gradient}</View>
      <View style={[styles.container, { marginBottom: insets.bottom }]}>
        <View style={[flex.row, { gap: TABS_GAP }]}>
          <Animated.View
            style={[styles.activeIndicator, activeIndicatorStyle]}
          />
          {routes.map(({ name, icon }, idx) => (
            <RouteButton
              key={name}
              name={name}
              icon={icon}
              iconPosition={idx < routes.length / 2 ? 'left' : 'right'}
              onPress={() => {
                navigation.navigate(name as never);
              }}
              onMeasure={(width) => handleMeasure(width, idx)}
              currentRoute={currentRoute}
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
  iconPosition,
  name,
  icon,
  onPress,
  currentRoute,
  onMeasure,
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
    <AnimatedIcon icon={icon} activationProgress={activationProgress} />
  );

  return (
    <Pressable
      onPress={onPress}
      style={styles.routeButton}
      onLayout={({
        nativeEvent: {
          layout: { width },
        },
      }) => onMeasure(width)}>
      {leftIcon && iconComponent}
      <Text variant="label1">
        <Animated.Text numberOfLines={1} style={animatedColorStyle}>
          {name}
        </Animated.Text>
      </Text>
      {rightIcon && iconComponent}
    </Pressable>
  );
}

type AnimatedIconProps = {
  icon: IconDefinition;
  activationProgress: SharedValue<number>;
};

function AnimatedIcon({ icon, activationProgress }: AnimatedIconProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: activationProgress.value,
  }));

  return (
    <View>
      <FontAwesomeIcon icon={icon} color={colors.foreground1} />
      <Animated.View style={[styles.iconOverlay, animatedStyle]}>
        <FontAwesomeIcon icon={icon} color={colors.background1} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background1,
    borderRadius: spacing.md,
    padding: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xxs,
    gap: spacing.xxs,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    gap: spacing.xs,
  },
  activeIndicator: {
    height: '100%',
    position: 'absolute',
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
  },
  iconOverlay: {
    position: 'absolute',
  },
});
