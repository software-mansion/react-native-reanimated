import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  LayoutAnimationConfig,
  LinearTransition,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { colors, flex, iconSizes, radius, spacing } from '@/theme';
import type { FontVariant } from '@/types';

import Text from '../core/Text';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

type ButtonSize = 'large' | 'medium' | 'small';

const BUTTON_VARIANTS: Record<
  ButtonSize,
  {
    fontVariant: FontVariant;
    buttonStyle: ViewStyle;
    iconSize: number;
  }
> = {
  large: {
    buttonStyle: {
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    fontVariant: 'label1',
    iconSize: iconSizes.md,
  },
  medium: {
    buttonStyle: {
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    fontVariant: 'label2',
    iconSize: iconSizes.sm,
  },
  small: {
    buttonStyle: {
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    fontVariant: 'label3',
    iconSize: iconSizes.xs,
  },
};

export type ButtonProps = {
  title: string;
  icon?: IconDefinition;
  size?: ButtonSize;
  activeOpacity?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
};

export default function Button({
  activeOpacity = 0.6,
  disabled = false,
  icon,
  onPress,
  size = 'medium',
  style,
  title,
}: ButtonProps) {
  const { buttonStyle, fontVariant, iconSize } = BUTTON_VARIANTS[size];

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <GestureDetector gesture={Gesture.Tap().onEnd(onPress).runOnJS(true)}>
        <AnimatedTouchableOpacity
          activeOpacity={activeOpacity}
          disabled={disabled}
          layout={LinearTransition}
          style={[
            styles.button,
            style,
            buttonStyle,
            disabled && styles.disabled,
          ]}>
          {icon && (
            <Animated.View entering={ZoomIn} exiting={ZoomOut}>
              <FontAwesomeIcon
                color={colors.white}
                icon={icon}
                size={iconSize}
              />
            </Animated.View>
          )}
          <Animated.View
            entering={FadeInRight}
            exiting={FadeOutLeft}
            key={title}>
            <Text style={styles.text} variant={fontVariant}>
              {title}
            </Text>
          </Animated.View>
        </AnimatedTouchableOpacity>
      </GestureDetector>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    gap: spacing.xs,
    overflow: 'hidden',
    ...flex.center,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
  },
});
