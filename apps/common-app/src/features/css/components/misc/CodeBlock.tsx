// TODO: Maybe replace with react-native-live-markdown with custom parser
// to add text highlighting

import { useEffect, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  LayoutAnimationConfig,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

import ExpandableCard from '../cards/ExpandableCard';
import Text from '../core/Text';
import Scroll from '../layout/Scroll';

type CodeBlockProps = {
  code: string;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
};

export function CodeBlock({ code, scrollable = true, style }: CodeBlockProps) {
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
    <Scroll contentContainerStyle={[styles.codeContainer, style]} horizontal>
      {content}
    </Scroll>
  ) : (
    <View style={[styles.codeContainer, style]}>{content}</View>
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
  expanded = false,
  expandedCode,
  showExpandOverlay = false,
  style,
}: ExpandableCodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  useEffect(() => setIsExpanded(expanded), [expanded]);

  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <ExpandableCard
        expanded={isExpanded}
        showExpandOverlay={showExpandOverlay}
        style={style}
        onChange={setIsExpanded}>
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
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  codeContainer: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
