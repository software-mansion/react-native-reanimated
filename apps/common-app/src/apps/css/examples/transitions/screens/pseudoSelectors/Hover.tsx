import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import { Circle, Svg } from 'react-native-svg';

import {
  Screen,
  Scroll,
  Section,
  Text,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(
  Circle
) as ComponentType<Record<string, unknown>>;

export default function Hover() {
  return (
    <Screen>
      <Scroll contentContainerStyle={styles.content} withBottomBarSpacing>
        <Section
          description="Hover effects use the ':hover' key inside style props. The transition is driven by CSS transitions, no JS thread involvement."
          title="Hover">
          <VerticalExampleCard
            title="Scale"
            code={`<Animated.View
  style={{
    transform: {
      default: [{ scale: 1 }],
      ':hover': [{ scale: 1.1 }],
    },
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-in-out',
  }}
/>`}
            collapsedCode={`transform: {
  default: [{ scale: 1 }],
  ':hover': [{ scale: 1.1 }],
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: colors.primary,
                  transform: {
                    ':hover': [{ scale: 1.1 }],
                    default: [{ scale: 1 }],
                  },
                  transitionDuration: '150ms',
                  transitionTimingFunction: 'ease-in-out',
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Background color"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryDark,
    },
    transitionDuration: '200ms',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.primary,
  ':hover': colors.primaryDark,
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: {
                    ':hover': colors.primaryDark,
                    default: colors.primary,
                  },
                  transitionDuration: '200ms',
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Border radius"
            code={`<Animated.View
  style={{
    borderRadius: {
      default: 4,
      ':hover': 24,
    },
    transitionDuration: '300ms',
    transitionTimingFunction: 'ease-in-out',
  }}
/>`}
            collapsedCode={`borderRadius: {
  default: 4,
  ':hover': 24,
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: colors.primary,
                  borderRadius: {
                    ':hover': sizes.md / 2,
                    default: radius.xs,
                  },
                  transitionDuration: '300ms',
                  transitionTimingFunction: 'ease-in-out',
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Opacity"
            code={`<Animated.View
  style={{
    opacity: {
      default: 0.4,
      ':hover': 1,
    },
    transitionDuration: '120ms',
  }}
/>`}
            collapsedCode={`opacity: {
  default: 0.4,
  ':hover': 1,
},`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: colors.primary,
                  opacity: {
                    ':hover': 1,
                    default: 0.4,
                  },
                  transitionDuration: '120ms',
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Multiple properties"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryDark,
    },
    transform: {
      default: [{ scale: 1 }],
      ':hover': [{ scale: 1.05 }],
    },
    shadowOpacity: {
      default: 0,
      ':hover': 0.3,
    },
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease-in-out',
  }}
/>`}
            collapsedCode={`backgroundColor: {
  default: colors.primary,
  ':hover': colors.primaryDark,
},
transform: {
  default: [{ scale: 1 }],
  ':hover': [{ scale: 1.05 }],
},
shadowOpacity: {
  default: 0,
  ':hover': 0.3,
},`}>
            <View style={styles.shadowHost}>
              <Animated.View
                style={[
                  styles.box,
                  {
                    backgroundColor: {
                      ':hover': colors.primaryDark,
                      default: colors.primary,
                    },
                    shadowColor: colors.primaryDark,
                    shadowOffset: { height: 4, width: 0 },
                    shadowOpacity: {
                      ':hover': 0.3,
                      default: 0,
                    },
                    shadowRadius: 12,
                    transform: {
                      ':hover': [{ scale: 1.05 }],
                      default: [{ scale: 1 }],
                    },
                    transitionDuration: '200ms',
                    transitionTimingFunction: 'ease-in-out',
                  },
                ]}
              />
            </View>
          </VerticalExampleCard>

          <VerticalExampleCard
            collapsedExampleHeight={180}
            description="Touch ':hover' hit-tests the topmost view, so only one of two overlapping circles reacts. Tap the lens where the front circle covers the back one: only the front (blue) circle highlights, even though the touch is inside the back circle's bounds too."
            title="Overlapping views"
            code={`<View style={{ flexDirection: 'row' }}>
  {/* Back circle - drawn first, so it sits underneath */}
  <Animated.View
    style={{
      backgroundColor: { default: '#fca5a5', ':hover': '#dc2626' },
      transform: { default: [{ scale: 1 }], ':hover': [{ scale: 1.05 }] },
      transitionDuration: '150ms',
    }}
  />
  {/* Front circle - drawn last (on top), pulled left to overlap */}
  <Animated.View
    style={{
      marginLeft: -56,
      backgroundColor: { default: '#93c5fd', ':hover': '#2563eb' },
      transform: { default: [{ scale: 1 }], ':hover': [{ scale: 1.05 }] },
      transitionDuration: '150ms',
    }}
  />
</View>`}
            collapsedCode={`backgroundColor: {
  default: '#93c5fd',
  ':hover': '#2563eb',
},`}>
            <View style={styles.stage}>
              <Animated.View
                style={[
                  styles.circle,
                  {
                    backgroundColor: {
                      ':hover': '#dc2626',
                      default: '#fca5a5',
                    },
                    transform: {
                      ':hover': [{ scale: 1.05 }],
                      default: [{ scale: 1 }],
                    },
                    transitionDuration: '150ms',
                  },
                ]}>
                <Text style={styles.circleLabel} variant="label2">
                  Back
                </Text>
              </Animated.View>
              <Animated.View
                style={[
                  styles.circle,
                  styles.frontCircle,
                  {
                    backgroundColor: {
                      ':hover': '#2563eb',
                      default: '#93c5fd',
                    },
                    transform: {
                      ':hover': [{ scale: 1.05 }],
                      default: [{ scale: 1 }],
                    },
                    transitionDuration: '150ms',
                  },
                ]}>
                <Text style={styles.circleLabel} variant="label2">
                  Front
                </Text>
              </Animated.View>
            </View>
          </VerticalExampleCard>

          <VerticalExampleCard
            collapsedExampleHeight={180}
            description="The same topmost-only rule holds for react-native-svg: its elements are drawn on a shared SvgView canvas and RNSVG hit-tests the front-most one. Tap the lens where the circles overlap - only the front (blue) circle changes fill, even though the point is inside the back circle too."
            title="Overlapping SVG elements"
            code={`<Svg>
  {/* Back circle - drawn first, so it sits underneath */}
  <AnimatedCircle
    cx={95} cy={90} r={65} fill="#fca5a5"
    style={{
      fill: { default: '#fca5a5', ':hover': '#dc2626' },
      transitionDuration: '150ms',
    }}
    onStartShouldSetResponder={() => true}
  />
  {/* Front circle - drawn last, so it sits on top */}
  <AnimatedCircle
    cx={145} cy={90} r={65} fill="#93c5fd"
    style={{
      fill: { default: '#93c5fd', ':hover': '#2563eb' },
      transitionDuration: '150ms',
    }}
    onStartShouldSetResponder={() => true}
  />
</Svg>`}
            collapsedCode={`fill: {
  default: '#93c5fd',
  ':hover': '#2563eb',
},`}>
            <View style={styles.stage}>
              <Svg height={180} width={240}>
                <AnimatedCircle
                  cx={95}
                  cy={90}
                  fill="#fca5a5"
                  r={65}
                  style={{
                    fill: {
                      ':hover': '#dc2626',
                      default: '#fca5a5',
                    },
                    transitionDuration: '150ms',
                  }}
                  onStartShouldSetResponder={() => true}
                />
                <AnimatedCircle
                  cx={145}
                  cy={90}
                  fill="#93c5fd"
                  r={65}
                  style={{
                    fill: {
                      ':hover': '#2563eb',
                      default: '#93c5fd',
                    },
                    transitionDuration: '150ms',
                  }}
                  onStartShouldSetResponder={() => true}
                />
              </Svg>
            </View>
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
  circle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 140,
    justifyContent: 'center',
    width: 140,
  },
  circleLabel: {
    color: colors.white,
  },
  content: {
    gap: spacing.xs,
  },
  frontCircle: {
    // Overlap ~40% of the diameter so the two circles share a clear lens.
    marginLeft: -56,
  },
  shadowHost: {
    padding: spacing.md,
  },
  stage: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 180,
    justifyContent: 'center',
    width: '100%',
  },
});
