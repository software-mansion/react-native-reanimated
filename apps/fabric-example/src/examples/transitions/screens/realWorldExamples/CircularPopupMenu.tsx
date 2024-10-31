import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import {
  faCog,
  faComment,
  faHeart,
  faHome,
  faPhone,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useState } from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { CSSTransitionConfig } from 'react-native-reanimated';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { ScrollScreen } from '@/components';
import { colors, flex, iconSizes, radius, sizes, spacing } from '@/theme';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CircularPopupMenu() {
  return (
    <ScrollScreen contentContainerStyle={styles.container}>
      <CircularMenu />
    </ScrollScreen>
  );
}

const MENU_ITEMS = [
  { icon: faHome },
  { icon: faHeart },
  { icon: faComment },
  { icon: faStar },
  { icon: faPhone },
  { icon: faCog },
];

function CircularMenu() {
  const [open, setOpen] = useState(false);

  return (
    <View style={flex.center}>
      {MENU_ITEMS.map((item, index) => (
        <MenuItem icon={item.icon} index={index} key={index} open={open} />
      ))}
      <AnimatedPressable
        style={[
          styles.menuButtonWrapper,
          {
            backgroundColor: open ? colors.primaryDark : colors.primary,
            transform: [{ scale: open ? 0.75 : 1 }],
            transitionDuration: 400,
            transitionProperty: 'all',
            transitionTimingFunction: cubicBezier(0.175, 0.885, 0.32, 1.275),
          },
        ]}
        onPress={() => setOpen(!open)}>
        <MenuButton open={open} />
      </AnimatedPressable>
    </View>
  );
}

const BUTTON_SIZE = sizes.xs;

type MenuButtonProps = {
  open: boolean;
};

function MenuButton({ open }: MenuButtonProps) {
  const transitionConfig: CSSTransitionConfig = {
    transitionDuration: 200,
    transitionProperty: 'all',
  };
  const lineStyle = [transitionConfig, styles.menuButtonLine];

  return (
    <View style={styles.menuButton}>
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '45deg' }]
              : [{ translateY: -0.3 * BUTTON_SIZE }],
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            opacity: open ? 0 : 1,
          },
        ]}
      />
      <Animated.View
        style={[
          lineStyle,
          {
            transform: open
              ? [{ rotate: '-45deg' }]
              : [{ translateY: 0.3 * BUTTON_SIZE }],
          },
        ]}
      />
    </View>
  );
}

type MenuItemProps = {
  icon: IconDefinition;
  open: boolean;
  index: number;
};

function MenuItem({ icon, index, open }: MenuItemProps) {
  const angle = 180 + (index * 360) / MENU_ITEMS.length;

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.menuItem,
        {
          transform: open
            ? [
                { rotate: `${angle}deg` },
                { translateY: 3.5 * BUTTON_SIZE },
                { rotate: `-${angle}deg` },
                { scale: 1.2 },
              ]
            : [
                { rotate: `${angle}deg` },
                { translateY: 0 },
                { rotate: `-${angle}deg` },
              ],
          transitionDuration: open ? 180 + index * 100 : 200,
          transitionProperty: 'transform',
          transitionTimingFunction: cubicBezier(0.935, 0, 0.34, 1.33),
        },
      ]}>
      <FontAwesomeIcon color={colors.white} icon={icon} size={iconSizes.lg} />
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...flex.center,
  },
  menuButton: {
    ...flex.center,
    height: BUTTON_SIZE,
    width: BUTTON_SIZE,
  },
  menuButtonLine: {
    backgroundColor: colors.white,
    borderRadius: radius.full,
    height: 3,
    position: 'absolute',
    width: '100%',
  },
  menuButtonWrapper: {
    borderRadius: radius.full,
    padding: spacing.lg,
  },
  menuItem: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    padding: spacing.md,
    position: 'absolute',
  },
});
