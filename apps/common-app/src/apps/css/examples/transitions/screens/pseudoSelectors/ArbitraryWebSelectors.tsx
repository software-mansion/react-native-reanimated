import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { createAnimatedComponent } from 'react-native-reanimated';

import {
  Screen,
  Scroll,
  Section,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

const AnimatedTextInput = createAnimatedComponent(TextInput);
const AnimatedPressable = createAnimatedComponent(Pressable);

export default function ArbitraryWebSelectors() {
  const [value, setValue] = useState('');

  return (
    <Screen>
      <Scroll contentContainerStyle={styles.content} withBottomBarSpacing>
        <Section
          description="All selectors here are web-only (native ignores them). The first example uses an ARBITRARY selector that isn't in the public CSSPseudoSelectorKey types - TypeScript rejects it, so we opt in with @ts-expect-error; it isn't officially supported, but the web layer forwards raw CSS pseudo-classes so it still works in the browser. The remaining examples use selectors that ARE part of the typed API."
          labelTypes={['web']}
          title="Web-only CSS pseudo-classes">
          <VerticalExampleCard
            description=":nth-child(odd) targets every other element. Each row receives the same style block; only those at odd DOM positions take the highlighted background."
            labelTypes={['web']}
            title=":nth-child(odd)"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primaryLight,
      ':nth-child(odd)': colors.primaryDark,
    },
    transitionDuration: '200ms',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.primaryLight,
  ':nth-child(odd)': colors.primaryDark,
},`}>
            <View style={styles.list}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.row,
                    {
                      backgroundColor: {
                        // @ts-expect-error -- arbitrary web pseudo-classes aren't in the public CSSPseudoSelectorKey types (#9597); the web layer still forwards them (native ignores them).
                        ':nth-child(odd)': colors.primaryDark,
                        default: colors.primaryLight,
                      },
                      transitionDuration: '200ms',
                    },
                  ]}
                />
              ))}
            </View>
          </VerticalExampleCard>

          <VerticalExampleCard
            description=":first-child and :last-child highlight the ends of a list with different colors."
            labelTypes={['web']}
            title=":first-child / :last-child"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primaryLight,
      ':first-child': colors.primary,
      ':last-child': colors.primaryDark,
    },
    transitionDuration: '200ms',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.primaryLight,
  ':first-child': colors.primary,
  ':last-child': colors.primaryDark,
},`}>
            <View style={styles.list}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.row,
                    {
                      backgroundColor: {
                        ':first-child': colors.primary,
                        ':last-child': colors.primaryDark,
                        default: colors.primaryLight,
                      },
                      transitionDuration: '200ms',
                    },
                  ]}
                />
              ))}
            </View>
          </VerticalExampleCard>

          <VerticalExampleCard
            description=":empty matches elements with no children. Here the even rows are empty and animate; the odd rows contain a child element and stay put."
            labelTypes={['web']}
            title=":empty"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primaryLight,
      ':empty': colors.primaryDark,
    },
    transitionDuration: '200ms',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.primaryLight,
  ':empty': colors.primaryDark,
},`}>
            <View style={styles.list}>
              {[0, 1, 2, 3].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.row,
                    {
                      backgroundColor: {
                        ':empty': colors.primaryDark,
                        default: colors.primaryLight,
                      },
                      transitionDuration: '200ms',
                    },
                  ]}>
                  {i % 2 === 1 ? <View style={styles.rowChild} /> : null}
                </Animated.View>
              ))}
            </View>
          </VerticalExampleCard>

          <VerticalExampleCard
            description=":placeholder-shown fires while the input has no value (placeholder visible). Type to see the border collapse."
            labelTypes={['web']}
            title=":placeholder-shown"
            code={`<AnimatedTextInput
  placeholder="Type something..."
  style={{
    borderColor: colors.foreground3,
    borderWidth: {
      default: 1,
      ':placeholder-shown': 3,
    },
    transitionDuration: '200ms',
  }}
/>`}
            collapsedCode={`borderWidth: {
  default: 1,
  ':placeholder-shown': 3,
},`}>
            <AnimatedTextInput
              placeholder="Type something..."
              value={value}
              style={[
                styles.input,
                {
                  borderWidth: {
                    ':placeholder-shown': 3,
                    default: 1,
                  },
                  transitionDuration: '200ms',
                },
              ]}
              onChangeText={setValue}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            description=":focus-visible matches when the button is focused via the keyboard (Tab) - not on click. Tab to it to see it highlight; clicking won't."
            labelTypes={['web']}
            title=":focus-visible (keyboard focus)"
            code={`<AnimatedPressable
  style={{
    backgroundColor: {
      default: colors.foreground3,
      ':focus-visible': colors.primary,
    },
    transitionDuration: '150ms',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.foreground3,
  ':focus-visible': colors.primary,
},`}>
            <AnimatedPressable
              style={[
                styles.button,
                {
                  backgroundColor: {
                    ':focus-visible': colors.primary,
                    default: colors.foreground3,
                  },
                  transitionDuration: '150ms',
                },
              ]}>
              <Text style={styles.buttonLabel}>Tab to focus</Text>
            </AnimatedPressable>
          </VerticalExampleCard>
        </Section>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: sizes.md,
    justifyContent: 'center',
    width: sizes.xxl,
  },
  buttonLabel: {
    color: colors.foreground1,
  },
  content: {
    gap: spacing.xs,
  },
  input: {
    backgroundColor: colors.background2,
    borderColor: colors.foreground3,
    borderRadius: radius.md,
    color: colors.foreground1,
    height: sizes.md,
    paddingHorizontal: spacing.sm,
    width: sizes.xxl,
  },
  list: {
    flexDirection: 'column',
    gap: spacing.xxs,
  },
  row: {
    borderRadius: radius.sm,
    height: sizes.xs,
    width: sizes.xxl,
  },
  rowChild: {
    height: '100%',
    width: spacing.xs,
  },
});
