import { StyleSheet, TextInput } from 'react-native';
import { createAnimatedComponent } from 'react-native-reanimated';

import {
  Screen,
  Scroll,
  Section,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, radius, spacing } from '@/theme';

const AnimatedTextInput = createAnimatedComponent(TextInput);

export default function Focus() {
  return (
    <Screen>
      <Scroll
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        withBottomBarSpacing>
        <Section
          description="The ':focus' selector fires when a text input directly gains focus. Tap a field to see the transition."
          title=":focus">
          <VerticalExampleCard
            collapsedExampleHeight={80}
            title="Border highlight"
            code={`<AnimatedTextInput
  style={{
    borderColor: {
      default: colors.background3,
      ':focus': colors.primary,
    },
    borderWidth: {
      default: 1.5,
      ':focus': 2.5,
    },
    backgroundColor: {
      default: colors.background1,
      ':focus': colors.primaryLight,
    },
    transitionDuration: '150ms',
  }}
/>`}
            collapsedCode={`borderColor: {
  default: colors.background3,
  ':focus': colors.primary,
},
borderWidth: {
  default: 1.5,
  ':focus': 2.5,
},`}>
            <AnimatedTextInput
              autoCapitalize="none"
              placeholder="Tap to focus"
              placeholderTextColor={colors.foreground3}
              style={[
                styles.input,
                {
                  backgroundColor: {
                    ':focus': colors.primaryLight,
                    default: colors.background1,
                  },
                  borderColor: {
                    ':focus': colors.primary,
                    default: colors.background3,
                  },
                  borderWidth: {
                    ':focus': 2.5,
                    default: 1.5,
                  },
                  transitionDuration: '150ms',
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            collapsedExampleHeight={80}
            title="Scale and opacity"
            code={`<AnimatedTextInput
  style={{
    transform: {
      default: [{ scale: 1 }],
      ':focus': [{ scale: 1.02 }],
    },
    opacity: {
      default: 0.6,
      ':focus': 1,
    },
    transitionDuration: '150ms',
  }}
/>`}
            collapsedCode={`transform: {
  default: [{ scale: 1 }],
  ':focus': [{ scale: 1.02 }],
},
opacity: {
  default: 0.6,
  ':focus': 1,
},`}>
            <AnimatedTextInput
              placeholder="Tap to focus"
              placeholderTextColor={colors.foreground3}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background2,
                  borderColor: colors.background3,
                  borderWidth: 1.5,
                  opacity: {
                    ':focus': 1,
                    default: 0.6,
                  },
                  transform: {
                    ':focus': [{ scale: 1.02 }],
                    default: [{ scale: 1 }],
                  },
                  transitionDuration: '150ms',
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            collapsedExampleHeight={80}
            title="Background color"
            code={`<AnimatedTextInput
  style={{
    backgroundColor: {
      default: colors.background2,
      ':focus': colors.primaryLight,
    },
    transitionDuration: '200ms',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.background2,
  ':focus': colors.primaryLight,
},`}>
            <AnimatedTextInput
              placeholder="Tap to focus"
              placeholderTextColor={colors.foreground3}
              style={[
                styles.input,
                {
                  backgroundColor: {
                    ':focus': colors.primaryLight,
                    default: colors.background2,
                  },
                  borderColor: colors.background3,
                  borderWidth: 1.5,
                  transitionDuration: '200ms',
                },
              ]}
            />
          </VerticalExampleCard>
        </Section>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
});
