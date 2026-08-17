import { StyleSheet, TextInput } from 'react-native';
import Animated, { createAnimatedComponent } from 'react-native-reanimated';

import {
  Screen,
  Scroll,
  Section,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, radius, spacing } from '@/theme';

const AnimatedTextInput = createAnimatedComponent(TextInput);

export default function FocusWithin() {
  return (
    <Screen>
      <Scroll
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        withBottomBarSpacing>
        <Section
          description="':focus-within' fires on any View when any descendant text input gains focus. Useful for animating a container when its fields are active."
          title=":focus-within">
          <VerticalExampleCard
            collapsedExampleHeight={160}
            title="Container reacts to inner focus"
            code={`<Animated.View
  style={{
    borderColor: {
      default: colors.background3,
      ':focus-within': colors.primary,
    },
    borderWidth: {
      default: 1.5,
      ':focus-within': 2.5,
    },
    backgroundColor: {
      default: colors.background1,
      ':focus-within': colors.primaryLight,
    },
    transitionDuration: '200ms',
  }}>
  <AnimatedTextInput style={{ ... }} />
  <AnimatedTextInput style={{ ... }} />
</Animated.View>`}
            collapsedCode={`
borderColor: {
  default: colors.background3,
  ':focus-within': colors.primary,
},`}>
            <Animated.View
              style={[
                styles.formCard,
                {
                  backgroundColor: {
                    ':focus-within': colors.primaryLight,
                    default: colors.background1,
                  },
                  borderColor: {
                    ':focus-within': colors.primary,
                    default: colors.background3,
                  },
                  borderWidth: {
                    ':focus-within': 2.5,
                    default: 1.5,
                  },
                  transitionDuration: '200ms',
                },
              ]}>
              <AnimatedTextInput
                autoCapitalize="none"
                placeholder="Username"
                placeholderTextColor={colors.foreground3}
                style={[
                  styles.formInput,
                  {
                    borderColor: {
                      ':focus': colors.primary,
                      default: colors.background3,
                    },
                    borderWidth: { ':focus': 2, default: 1 },
                    transitionDuration: '150ms',
                  },
                ]}
              />
              <AnimatedTextInput
                placeholder="Password"
                placeholderTextColor={colors.foreground3}
                style={[
                  styles.formInput,
                  {
                    borderColor: {
                      ':focus': colors.primary,
                      default: colors.background3,
                    },
                    borderWidth: { ':focus': 2, default: 1 },
                    transitionDuration: '150ms',
                  },
                ]}
                secureTextEntry
              />
            </Animated.View>
          </VerticalExampleCard>

          <VerticalExampleCard
            collapsedExampleHeight={120}
            title="Card lift on focus"
            code={`<Animated.View
  style={{
    transform: {
      default: [{ scale: 1 }],
      ':focus-within': [{ scale: 1.02 }],
    },
    shadowOpacity: {
      default: 0,
      ':focus-within': 0.15,
    },
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease-out',
  }}>
  <AnimatedTextInput style={{ ... }} />
</Animated.View>`}
            collapsedCode={`
transform: {
  default: [{ scale: 1 }],
  ':focus-within': [{ scale: 1.02 }],
},
shadowOpacity: {
  default: 0,
  ':focus-within': 0.15,
},`}>
            <Animated.View
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.background1,
                  borderColor: colors.background3,
                  borderWidth: 1.5,
                  shadowColor: colors.primary,
                  shadowOffset: { height: 4, width: 0 },
                  shadowOpacity: {
                    ':focus-within': 0.15,
                    default: 0,
                  },
                  shadowRadius: 12,
                  transform: {
                    ':focus-within': [{ scale: 1.02 }],
                    default: [{ scale: 1 }],
                  },
                  transitionDuration: '200ms',
                  transitionTimingFunction: 'ease-out',
                },
              ]}>
              <AnimatedTextInput
                placeholder="Search..."
                placeholderTextColor={colors.foreground3}
                style={[styles.formInput, { borderWidth: 0 }]}
              />
            </Animated.View>
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
  formCard: {
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.sm,
    width: '100%',
  },
  formInput: {
    backgroundColor: colors.background1,
    borderRadius: radius.sm,
    height: 42,
    paddingHorizontal: spacing.sm,
  },
});
