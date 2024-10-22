// TODO: Maybe replace with react-native-live-markdown with custom parser
// to add text highlighting

import { useEffect, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { ExpandableCard } from '../cards';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  LayoutAnimationConfig,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../../theme';
import { Scroll } from '../layout';
import { Text } from '../core';

type CodeBlockProps = {
  code: string;
  scrollable?: boolean;
};

export function CodeBlock({ code, scrollable = true }: CodeBlockProps) {
  const formattedCode = useMemo(() => {
    // Remove empty lines at the beginning and end
    const result = code.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
    // trim whitespace from the left to the first character (in any line)
    const firstChar = result.search(/\S|$/);
    return result.replace(new RegExp(`^ {${firstChar}}`, 'gm'), '');
  }, [code]);

  const content = (
    <Text>
      {formattedCode.split('\n').map((line, index) => (
        <Text key={index} variant="code">
          {index > 0 && '\n'}
          {line}
        </Text>
      ))}
    </Text>
  );

  return scrollable ? (
    <Scroll horizontal contentContainerStyle={styles.codeContainer}>
      {content}
    </Scroll>
  ) : (
    content
  );
}

type ExpandableCodeBlockProps = {
  expandedCode: string;
  expanded?: boolean;
  collapsedCode?: string;
  showExpandOverlay?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ExpandableCodeBlock({
  collapsedCode,
  expandedCode,
  style,
  showExpandOverlay = false,
  expanded = false,
}: ExpandableCodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  useEffect(() => setIsExpanded(expanded), [expanded]);

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <ExpandableCard
        expanded={isExpanded}
        style={style}
        onChange={setIsExpanded}
        showExpandOverlay={showExpandOverlay}>
        {isExpanded && (
          <Animated.View
            entering={FadeInUp}
            exiting={FadeOutUp}
            style={styles.block}>
            <CodeBlock code={expandedCode} />
          </Animated.View>
        )}
        {/* Render collapsedCode block as an overlay to ensure that the layout
          transition is smooth when the container is expanded/collapsed */}
        {collapsedCode && !isExpanded && (
          <Animated.View
            entering={FadeInDown}
            exiting={FadeOutDown}
            style={styles.block}>
            <CodeBlock code={collapsedCode} />
          </Animated.View>
        )}
      </ExpandableCard>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.background2,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  codeContainer: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
});
