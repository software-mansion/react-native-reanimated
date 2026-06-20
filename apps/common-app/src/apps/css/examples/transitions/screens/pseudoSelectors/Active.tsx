import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
// TODO: Fix me
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Circle, G, Svg } from 'react-native-svg';

import {
  Screen,
  Scroll,
  Section,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(
  Circle
) as ComponentType<Record<string, unknown>>;

export default function Active() {
  return (
    <Screen>
      <Scroll contentContainerStyle={styles.content} withBottomBarSpacing>
        <Section
          description="The ':active' selector fires while the user is pressing a view. It propagates up to all ancestor views that also have ':active' defined."
          title=":active">
          <VerticalExampleCard
            title="Scale"
            code={`<Animated.View
  style={{
    transform: {
      default: [{ scale: 1 }],
      ':active': [{ scale: 0.9 }],
    },
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-in-out',
  }}
/>`}
            collapsedCode={`transform: {
  default: [{ scale: 1 }],
  ':active': [{ scale: 0.9 }],
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: colors.primary,
                  transform: {
                    ':active': [{ scale: 0.9 }],
                    default: [{ scale: 1 }],
                  },
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                },
              ]}
              onStartShouldSetResponder={() => true}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Background color"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primary,
      ':active': colors.primaryDark,
    },
    transitionDuration: '150ms',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.primary,
  ':active': colors.primaryDark,
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: {
                    ':active': colors.primaryDark,
                    default: colors.primary,
                  },
                  transitionDuration: '150ms',
                },
              ]}
              onStartShouldSetResponder={() => true}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Border"
            code={`<Animated.View
  style={{
    borderColor: {
      default: colors.primary,
      ':active': colors.primaryDark,
    },
    borderWidth: {
      default: 2,
      ':active': 4,
    },
    transitionDuration: '120ms',
  }}
/>`}
            collapsedCode={`borderColor: {
  default: colors.primary,
  ':active': colors.primaryDark,
},
borderWidth: {
  default: 2,
  ':active': 4,
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  borderColor: {
                    ':active': colors.primaryDark,
                    default: colors.primary,
                  },
                  borderWidth: {
                    ':active': 4,
                    default: 2,
                  },
                  transitionDuration: '120ms',
                },
              ]}
              onStartShouldSetResponder={() => true}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Opacity"
            code={`<Animated.View
  style={{
    opacity: {
      default: 1,
      ':active': 0.5,
    },
    transitionDuration: '120ms',
  }}
/>`}
            collapsedCode={`opacity: {
  default: 1,
  ':active': 0.5,
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: colors.primary,
                  opacity: {
                    ':active': 0.5,
                    default: 1,
                  },
                  transitionDuration: '120ms',
                },
              ]}
              onStartShouldSetResponder={() => true}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Multiple properties"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primary,
      ':active': colors.primaryDark,
    },
    transform: {
      default: [{ scale: 1 }],
      ':active': [{ scale: 0.93 }],
    },
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-in-out',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.primary,
  ':active': colors.primaryDark,
},
transform: {
  default: [{ scale: 1 }],
  ':active': [{ scale: 0.93 }],
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: {
                    ':active': colors.primaryDark,
                    default: colors.primary,
                  },
                  transform: {
                    ':active': [{ scale: 0.93 }],
                    default: [{ scale: 1 }],
                  },
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                },
              ]}
              onStartShouldSetResponder={() => true}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="SVG fill"
            code={`// Base geometry stays as real props so it renders at rest;
// the ':active' style only swaps the changing prop.
<AnimatedCircle
  cx={20} cy={20} r={18}
  fill={colors.primary}
  style={{
    fill: { default: colors.primary, ':active': colors.primaryDark },
    transitionDuration: '200ms',
  }}
/>`}
            collapsedCode={`fill: {
  default: colors.primary,
  ':active': colors.primaryDark,
},`}>
            <Svg height={sizes.md} width={sizes.md}>
              <AnimatedCircle
                cx={sizes.md / 2}
                cy={sizes.md / 2}
                fill={colors.primary}
                r={sizes.md / 2 - 2}
                style={{
                  fill: {
                    ':active': colors.primaryDark,
                    default: colors.primary,
                  },
                  transitionDuration: '200ms',
                }}
              />
            </Svg>
          </VerticalExampleCard>

          <VerticalExampleCard
            title="SVG radius"
            code={`// r needs a base prop value, otherwise it renders at 0.
<AnimatedCircle
  cx={30} cy={30} fill={colors.primary}
  r={20}
  style={{
    r: { default: 20, ':active': 28 },
    transitionDuration: '200ms',
  }}
/>`}
            collapsedCode={`r: {
  default: 20,
  ':active': 28,
},`}>
            <Svg height={sizes.lg} width={sizes.lg}>
              <AnimatedCircle
                cx={sizes.lg / 2}
                cy={sizes.lg / 2}
                fill={colors.primary}
                r={sizes.lg / 3}
                style={{
                  r: { ':active': sizes.lg / 2 - 2, default: sizes.lg / 3 },
                  transitionDuration: '200ms',
                }}
              />
            </Svg>
          </VerticalExampleCard>

          <VerticalExampleCard
            collapsedCode={`// two circles, each with its own ':active' fill`}
            description="Two shapes under one Svg - pressing one animates only that shape."
            title="Multiple SVG shapes (independent)"
            code={`<Svg>
  <AnimatedCircle ... style={{ fill: { default, ':active' } }} />
  <AnimatedCircle ... style={{ fill: { default, ':active' } }} />
</Svg>`}>
            <Svg height={sizes.md} width={sizes.xl}>
              <AnimatedCircle
                cx={sizes.md / 2}
                cy={sizes.md / 2}
                fill={colors.primary}
                r={sizes.md / 2 - 2}
                style={{
                  fill: {
                    ':active': colors.primaryDark,
                    default: colors.primary,
                  },
                  transitionDuration: '200ms',
                }}
              />
              <AnimatedCircle
                cx={sizes.xl - sizes.md / 2}
                cy={sizes.md / 2}
                fill={colors.primary}
                r={sizes.md / 2 - 2}
                style={{
                  fill: {
                    ':active': colors.primaryDark,
                    default: colors.primary,
                  },
                  transitionDuration: '200ms',
                }}
              />
            </Svg>
          </VerticalExampleCard>

          <VerticalExampleCard
            collapsedCode="<G><AnimatedCircle ... /></G>"
            description="A circle nested inside a <G> still resolves ':active' through the SvgView host."
            title="SVG nested group"
            code={`<Svg>
  <G>
    <AnimatedCircle ... style={{ fill: { default, ':active' } }} />
  </G>
</Svg>`}>
            <Svg height={sizes.md} width={sizes.md}>
              <G>
                <AnimatedCircle
                  cx={sizes.md / 2}
                  cy={sizes.md / 2}
                  fill={colors.primary}
                  r={sizes.md / 2 - 2}
                  style={{
                    fill: {
                      ':active': colors.primaryDark,
                      default: colors.primary,
                    },
                    transitionDuration: '200ms',
                  }}
                />
              </G>
            </Svg>
          </VerticalExampleCard>
        </Section>

        <Section
          description="An 'undefined' selector value - or a selector provided without a 'default' - resets the property to its default value."
          title="Resolving to the default value">
          <VerticalExampleCard
            title="Reset on press (:active is undefined)"
            code={`<Animated.View
  style={{
    transform: {
      default: [{ scale: 1.3 }],
      ':active': undefined,
    },
    transitionDuration: '150ms',
  }}
/>`}
            collapsedCode={`transform: {
  default: [{ scale: 1.3 }],
  ':active': undefined,
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: colors.primary,
                  transform: {
                    ':active': undefined,
                    default: [{ scale: 1.3 }],
                  },
                  transitionDuration: '150ms',
                },
              ]}
              onStartShouldSetResponder={() => true}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Omitted default (opacity)"
            code={`<Animated.View
  style={{
    // No 'default' - rest state resolves to the property default (1).
    opacity: {
      ':active': 0.3,
    },
    transitionDuration: '150ms',
  }}
/>`}
            collapsedCode={`opacity: {
  ':active': 0.3,
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: colors.primary,
                  opacity: {
                    ':active': 0.3,
                  },
                  transitionDuration: '150ms',
                },
              ]}
              onStartShouldSetResponder={() => true}
            />
          </VerticalExampleCard>
        </Section>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    height: sizes.md,
    width: sizes.md,
  },
  content: {
    gap: spacing.xs,
  },
});
