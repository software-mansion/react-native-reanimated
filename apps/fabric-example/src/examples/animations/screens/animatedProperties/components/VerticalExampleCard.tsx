import { StyleSheet, TouchableOpacity } from 'react-native';
import { flex, colors, radius, spacing, sizes } from '../../../../../theme';
import { useState } from 'react';
import Animated, {
  FadeInDown,
  FadeInUp,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { ExpandableCard, CodeBlock, Text } from '../../../../../components';
import type { ExampleCardProps } from './ExampleCard';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export default function VerticalExampleCard({
  children,
  title,
  code,
  collapsedCode,
  description,
  collapsedExampleHeight = 150,
  minExampleHeight,
}: ExampleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <ExpandableCard expanded={true}>
        {title && (
          <Text variant="subHeading2" style={styles.title}>
            {title}
          </Text>
        )}
        {description && <Text style={styles.description}>{description}</Text>}
        <Animated.View style={styles.itemsContainer}>
          {/* Code block */}
          <Animated.View style={styles.itemWrapper} layout={LinearTransition}>
            {collapsedCode && !isExpanded && (
              <Animated.View style={styles.collapsedCode} entering={FadeInDown}>
                <CodeBlock code={collapsedCode} />
              </Animated.View>
            )}
            {code && isExpanded && (
              <Animated.View style={styles.expandedCode} entering={FadeInUp}>
                <CodeBlock code={code} />
              </Animated.View>
            )}
          </Animated.View>
          <Animated.View layout={LinearTransition}>
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              style={styles.expandButton}>
              <FontAwesomeIcon
                icon={isExpanded ? faChevronUp : faChevronDown}
                size={sizes.xxxs}
                color={colors.primary}
              />
              <Text variant="label2" style={styles.expandButtonText}>
                {isExpanded ? 'Collapse' : 'Expand'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          {/* Example */}
          <Animated.View
            layout={LinearTransition}
            style={[
              styles.itemWrapper,
              flex.center,
              {
                minHeight:
                  minExampleHeight ||
                  Math.min(
                    minExampleHeight ?? collapsedExampleHeight,
                    collapsedExampleHeight
                  ),
              },
            ]}>
            {children}
          </Animated.View>
        </Animated.View>
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
    flexDirection: 'column',
    height: 'auto',
  },
  itemWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    padding: spacing.xs,
  },
  expandedCode: {
    height: 'auto',
    padding: spacing.xs,
    backgroundColor: colors.background2,
  },
  collapsedCode: {
    height: 'auto',
    padding: spacing.xs,
    backgroundColor: colors.background2,
  },
  expandButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonText: {
    color: colors.primary,
  },
});
