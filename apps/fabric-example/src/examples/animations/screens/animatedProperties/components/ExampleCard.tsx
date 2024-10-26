import { View, StyleSheet } from 'react-native';
import { flex, colors, radius, spacing } from '../../../../../theme';
import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  LayoutAnimationConfig,
  FadeOutDown,
  FadeInDown,
} from 'react-native-reanimated';
import { ExpandableCard, CodeBlock, Text } from '../../../../../components';

export type ExampleCardProps = PropsWithChildren<{
  title?: string;
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
  minExampleHeight,
}: ExampleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const exampleContainerDimensions = useSharedValue<{
    width: number;
    height: number;
  } | null>(null);

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

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <ExpandableCard
        expanded={isExpanded}
        onChange={setIsExpanded}
        showExpandOverlay>
        {title && (
          <Text variant="subHeading2" style={styles.title}>
            {title}
          </Text>
        )}
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
          <Animated.View
            style={[
              styles.itemWrapper,
              flex.center,
              {
                minHeight:
                  minExampleHeight ||
                  Math.min(minExampleHeight ?? 150, collapsedExampleHeight),
              },
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
          </Animated.View>
        </View>
      </ExpandableCard>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.xs,
  },
  description: {
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
    overflow: 'hidden',
    padding: spacing.xs,
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
});
