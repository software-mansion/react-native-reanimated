import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeInUp,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';

import { CodeBlock, ExpandableCard, Text } from '@/components';
import { colors, flex, radius, sizes, spacing } from '@/theme';

import type { ExampleCardProps } from './ExampleCard';

export default function VerticalExampleCard({
  children,
  code,
  collapsedCode,
  collapsedExampleHeight = 150,
  description,
  minExampleHeight,
  title,
}: ExampleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <ExpandableCard expanded={true}>
        {title && (
          <Text style={styles.title} variant="subHeading2">
            {title}
          </Text>
        )}
        {description && <Text style={styles.description}>{description}</Text>}
        <Animated.View style={styles.itemsContainer}>
          {/* Code block */}
          <Animated.View layout={LinearTransition} style={styles.itemWrapper}>
            {collapsedCode && !isExpanded && (
              <Animated.View entering={FadeInDown} style={styles.collapsedCode}>
                <Pressable
                  style={flex.fill}
                  onPress={() => setIsExpanded(true)}>
                  <CodeBlock code={collapsedCode} />
                </Pressable>
              </Animated.View>
            )}
            {code && isExpanded && (
              <Animated.View entering={FadeInUp} style={styles.expandedCode}>
                <CodeBlock code={code} />
              </Animated.View>
            )}
          </Animated.View>
          <Animated.View layout={LinearTransition}>
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setIsExpanded(!isExpanded)}>
              <FontAwesomeIcon
                color={colors.primary}
                icon={isExpanded ? faChevronUp : faChevronDown}
                size={sizes.xxxs}
              />
              <Text style={styles.expandButtonText} variant="label2">
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
                  minExampleHeight ??
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
  collapsedCode: {
    backgroundColor: colors.background2,
    height: 'auto',
    padding: spacing.xs,
  },
  description: {
    marginBottom: spacing.sm,
  },
  expandButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  expandButtonText: {
    color: colors.primary,
  },
  expandedCode: {
    backgroundColor: colors.background2,
    height: 'auto',
    padding: spacing.xs,
  },
  itemWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    padding: spacing.xs,
  },
  itemsContainer: {
    flexDirection: 'column',
    gap: spacing.sm,
    height: 'auto',
  },
  title: {
    marginBottom: spacing.xs,
  },
});
