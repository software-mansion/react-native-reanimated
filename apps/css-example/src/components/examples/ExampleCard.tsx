import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOutDown,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button, CodeBlock, ExpandableCard, Text } from '@/components';
import { colors, flex, radius, spacing } from '@/theme';

export type ExampleCardProps = PropsWithChildren<{
  title?: string;
  code: string;
  collapsedCode?: string;
  description?: Array<string> | string;
  collapsedExampleHeight?: number;
  minExampleHeight?: number;
  showRestartButton?: boolean;
}>;

export default function ExampleCard({
  children,
  code,
  collapsedCode,
  collapsedExampleHeight = 150,
  description,
  minExampleHeight,
  showRestartButton,
  title,
}: ExampleCardProps) {
  const [key, setKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const exampleContainerDimensions = useSharedValue<{
    width: number;
    height: number;
  } | null>(null);

  const animatedExampleStyle = useAnimatedStyle(() => {
    if (!exampleContainerDimensions.value) {
      return {};
    }

    const { height, width } = exampleContainerDimensions.value;

    return {
      height: withTiming(height),
      width: withTiming(width),
    };
  });

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <ExpandableCard
        expanded={isExpanded}
        showExpandOverlay
        onChange={setIsExpanded}>
        <View style={styles.titleRow}>
          {title && <Text variant="subHeading2">{title}</Text>}
          {showRestartButton && (
            <Button
              title="Restart"
              onPress={() => setKey((prev) => prev + 1)}
            />
          )}
        </View>
        {description &&
          (Array.isArray(description) ? (
            <View style={styles.description}>
              {description.map((paragraph, index) => (
                <Text key={index}>{paragraph}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.description}>{description}</Text>
          ))}

        <View
          style={[
            styles.itemsContainer,
            isExpanded
              ? styles.itemsContainerExpanded
              : styles.itemsContainerCollapsed,
            { height: isExpanded ? 'auto' : collapsedExampleHeight },
          ]}>
          {/* Code block */}
          <Animated.View layout={LinearTransition} style={styles.itemWrapper}>
            <CodeBlock code={code} />
            {/* Render collapsedCode block as an overlay to ensure that the layout
            transition is smooth when the container is expanded/collapsed */}
            {collapsedCode && !isExpanded && (
              <Animated.View
                entering={FadeInDown}
                exiting={FadeOutDown}
                style={styles.collapsedCodeOverlay}>
                <Pressable
                  style={flex.fill}
                  onPress={() => setIsExpanded(true)}>
                  <CodeBlock code={collapsedCode} />
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
          {/* Example */}
          <Animated.View
            layout={LinearTransition}
            style={[
              styles.itemWrapper,
              flex.center,
              {
                minHeight:
                  minExampleHeight ??
                  Math.min(minExampleHeight ?? 150, collapsedExampleHeight),
              },
            ]}
            onLayout={({
              nativeEvent: {
                layout: { height, width },
              },
            }) => {
              exampleContainerDimensions.value = { height, width };
            }}>
            {/* This is a tricky way to ensure that the example is centered within
            the parent container during the layout transition. To do this, we wrap the
            example in a parent with 0x0 dimensions, which is centered in its parent and
            render another example wrapper with measured example container dimensions set
            via the animated style. Thanks to this, the example always stays centered inside
            the parent component and its dimensions are smoothly updated when the layout
            changes. */}
            <Animated.View
              layout={LinearTransition}
              style={styles.exampleOuterContainer}>
              <Animated.View
                key={key}
                style={[flex.center, animatedExampleStyle]}>
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
  collapsedCodeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background2,
    padding: spacing.xs,
  },
  description: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  exampleOuterContainer: {
    ...flex.center,
    height: 0,
    width: 0,
  },
  itemWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    flexBasis: '50%',
    overflow: 'hidden',
    padding: spacing.xs,
  },
  itemsContainer: {
    gap: spacing.sm,
  },
  itemsContainerCollapsed: {
    flexDirection: 'row',
    paddingRight: spacing.sm,
  },
  itemsContainerExpanded: {
    flexDirection: 'column',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
});
