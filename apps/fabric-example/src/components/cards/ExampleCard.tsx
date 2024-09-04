import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { flex, colors, radius, spacing, text } from '../../theme';
import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import Animated, {
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  LayoutAnimationConfig,
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { sizes } from '../../theme/sizes';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { CodeBlock } from '../misc';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export type ExampleCardProps = PropsWithChildren<{
  title: string;
  code: string;
  collapsedCode?: string;
  description?: string;
  collapsedExampleHeight?: number;
  minExampleHeight?: number;
}>;

export default function ExampleCard({
  children,
  title,
  code,
  collapsedCode,
  description,
  collapsedExampleHeight = 150,
  minExampleHeight = 150,
}: ExampleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandProgress = useDerivedValue(() => withTiming(isExpanded ? 1 : 0));
  const exampleContainerDimensions = useSharedValue<{
    width: number;
    height: number;
  } | null>(null);

  const animatedGradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 1], [1, 0]),
  }));

  const animatedExampleStyle = useAnimatedStyle(() => {
    if (!exampleContainerDimensions.value) {
      return {};
    }

    const { width, height } = exampleContainerDimensions.value;

    return {
      width: withTiming(width),
      height: withTiming(height),
    };
  });

  const OVERLAY_HEIGHT = sizes.xl;

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <Animated.View layout={LinearTransition} style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
        <View
          style={[
            styles.itemsContainer,
            isExpanded
              ? styles.itemsContainerExpanded
              : styles.itemsContainerCollapsed,
            { height: isExpanded ? 'auto' : collapsedExampleHeight },
          ]}>
          {/* Code block */}
          <Animated.View style={styles.itemWrapper} layout={LinearTransition}>
            <CodeBlock code={code} />
            {/* Render collapsedCode block as an overlay to ensure that the layout
            transition is smooth when the container is expanded/collapsed */}
            {collapsedCode && !isExpanded && (
              <Animated.View
                style={styles.collapsedCodeOverlay}
                exiting={FadeOutDown}
                entering={FadeInDown}>
                <CodeBlock code={collapsedCode} />
              </Animated.View>
            )}
          </Animated.View>

          {/* Example */}
          <AnimatedTouchableOpacity
            onPress={() => setIsExpanded(true)}
            disabled={isExpanded}
            style={[
              styles.itemWrapper,
              flex.center,
              { minHeight: minExampleHeight },
            ]}
            layout={LinearTransition}
            onLayout={({
              nativeEvent: {
                layout: { width, height },
              },
            }) => {
              exampleContainerDimensions.value = { width, height };
            }}>
            {/* This is a tricky way to ensure that the example is centered withing
            the parent container during the layout transition. To do this, we wrap the
            example in a parent with 0x0 dimensions, which is centered in its parent and
            render another example wrapper with measured example container dimensions set
            via the animated style. Thanks to this, the example always stays centered inside
            the parent component and its dimensions are smoothly updated when the layout
            changes. */}
            <Animated.View
              style={styles.exampleOuterContainer}
              layout={LinearTransition}>
              <Animated.View style={[flex.center, animatedExampleStyle]}>
                {children}
              </Animated.View>
            </Animated.View>
          </AnimatedTouchableOpacity>
        </View>

        {/* Overlay */}
        <Animated.View
          style={[styles.overlay, { height: OVERLAY_HEIGHT }]}
          layout={LinearTransition}>
          <Animated.View style={[styles.gradient, animatedGradientStyle]}>
            <Svg height={OVERLAY_HEIGHT} width="100%">
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

          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.expandButton}>
            <FontAwesomeIcon
              icon={isExpanded ? faChevronUp : faChevronDown}
              size={sizes.xxxs}
              color={colors.primary}
            />
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Collapse' : 'Expand'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    paddingBottom: spacing.xl,
  },
  title: {
    ...text.subHeading2,
    marginBottom: spacing.xs,
  },
  description: {
    ...text.body1,
    color: colors.foreground3,
    marginBottom: spacing.sm,
  },
  itemsContainer: {
    gap: spacing.sm,
  },
  itemsContainerCollapsed: {
    paddingRight: spacing.sm,
    flexDirection: 'row',
  },
  itemsContainerExpanded: {
    flexDirection: 'column',
  },
  itemWrapper: {
    flexBasis: '50%',
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    padding: spacing.xs,
    overflow: 'hidden',
  },
  exampleOuterContainer: {
    ...flex.center,
    width: 0,
    height: 0,
  },
  collapsedCodeOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    backgroundColor: colors.background2,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  expandButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  expandButtonText: {
    ...text.label2,
    color: colors.primary,
  },
});
