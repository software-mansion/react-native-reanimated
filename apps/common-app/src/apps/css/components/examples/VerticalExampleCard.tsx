import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';

import { colors, flex, radius, sizes, spacing } from '@/theme';

import ExpandableCard from '../cards/ExpandableCard';
import Text from '../core/Text';
import Button from '../inputs/Button';
import Description from '../layout/Description';
import { TitleWithLabels } from '../misc';
import { CodeBlock } from '../misc/CodeBlock';
import type { ExampleCardProps } from './ExampleCard';

export default function VerticalExampleCard({
  children,
  code,
  collapsedCode,
  collapsedExampleHeight = 150,
  description,
  labelTypes,
  minExampleHeight,
  showRestartButton,
  title,
}: ExampleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <ExpandableCard expanded={true}>
        <View style={styles.titleRow}>
          <TitleWithLabels
            labelTypes={labelTypes}
            title={title}
            variant="subHeading2"
          />
          {showRestartButton && (
            <Button
              title="Restart"
              onPress={() => setKey((prev) => prev + 1)}
            />
          )}
        </View>
        {description && (
          <Description style={styles.description}>{description}</Description>
        )}
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
            <Pressable
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
            </Pressable>
          </Animated.View>
          {/* Example */}
          <Animated.View
            key={key}
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
  itemsContainer: {
    flexDirection: 'column',
    gap: spacing.sm,
    height: 'auto',
  },
  itemWrapper: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    padding: spacing.xs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
});
