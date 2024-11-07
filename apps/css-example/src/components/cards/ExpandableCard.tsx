import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

import { Text } from '@/components/core';
import { colors, sizes, spacing } from '@/theme';

export type ExpandableCardProps = PropsWithChildren<{
  expanded: boolean;
  onChange?: (expanded: boolean) => void;
  showExpandOverlay?: boolean;
  overlayHeight?: number;
  style?: StyleProp<ViewStyle>;
}>;

export default function ExpandableCard({
  children,
  expanded,
  onChange,
  overlayHeight = sizes.lg,
  showExpandOverlay,
  style,
}: ExpandableCardProps) {
  const animatedGradientStyle = useAnimatedStyle(() => ({
    opacity: withTiming(+!expanded),
  }));

  return (
    <Animated.View
      layout={LinearTransition}
      style={[
        styles.container,
        { paddingBottom: showExpandOverlay ? spacing.lg : spacing.sm },
        style,
      ]}>
      {children}

      {/* Overlay */}
      {showExpandOverlay && (
        <Animated.View
          layout={LinearTransition}
          style={[styles.overlay, { height: overlayHeight }]}>
          <Animated.View style={[styles.gradient, animatedGradientStyle]}>
            <Svg height={overlayHeight} width="100%">
              <Defs>
                <LinearGradient
                  id="vertical-gradient"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1">
                  <Stop
                    offset="0"
                    stopColor={colors.background1}
                    stopOpacity="0"
                  />
                  <Stop
                    offset="0.8"
                    stopColor={colors.background1}
                    stopOpacity="1"
                  />
                </LinearGradient>
              </Defs>

              <Rect fill="url(#vertical-gradient)" height="100%" width="100%" />
            </Svg>
          </Animated.View>

          {/* Expand/Collapse button */}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => onChange?.(!expanded)}>
            <FontAwesomeIcon
              color={colors.primary}
              icon={expanded ? faChevronUp : faChevronDown}
              size={sizes.xxxs}
            />
            <Text style={styles.expandButtonText} variant="label2">
              {expanded ? 'Collapse' : 'Expand'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  expandButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  expandButtonText: {
    color: colors.primary,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
  },
});
