import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
// TODO: Fix me
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

function LayerLabel({ children }: { children: string }) {
  return (
    <Text
      style={{ color: colors.foreground3, fontFamily: 'UbuntuMono-Regular' }}
      variant="body3">
      {children}
    </Text>
  );
}

export default function ActiveDeepest() {
  return (
    <Screen>
      <Scroll contentContainerStyle={styles.content} withBottomBarSpacing>
        <Section
          description="':active-deepest' fires only on the bottommost element that captures the press, without propagating to ancestors. Useful when you want only the exact pressed element to react."
          title=":active-deepest">
          <VerticalExampleCard
            collapsedExampleHeight={180}
            title="Only bottommost activates"
            code={`
<Animated.View style={{ backgroundColor: { default: '#fce8e8', ':active-deepest': '#f7bdbd' }, ... }}>
  <Animated.View style={{ backgroundColor: { default: '#ffcdd2', ':active-deepest': '#ef9a9a' }, ... }}>
    <Animated.View
      style={{
        backgroundColor: { default: '#e53935', ':active-deepest': '#b71c1c' },
        transform: { default: [{ scale: 1 }], ':active-deepest': [{ scale: 0.9 }] },
      }}
    />
  </Animated.View>
</Animated.View>`}
            collapsedCode={`
backgroundColor: {
  default: '#e53935',
  ':active-deepest': '#b71c1c',
},
transform: {
  default: [{ scale: 1 }],
  ':active-deepest': [{ scale: 0.9 }],
},`}>
            <View style={styles.nestedContainer}>
              <Animated.View
                style={[
                  styles.layer1,
                  {
                    backgroundColor: {
                      ':active-deepest': '#f7bdbd',
                      default: '#fce8e8',
                    },
                    borderColor: {
                      ':active-deepest': '#b71c1c',
                      default: '#f48fb1',
                    },
                    transitionDuration: '150ms',
                  },
                ]}>
                <LayerLabel>Layer 1 (card)</LayerLabel>
                <Animated.View
                  style={[
                    styles.layer2,
                    {
                      backgroundColor: {
                        ':active-deepest': '#ef9a9a',
                        default: '#ffcdd2',
                      },
                      borderColor: {
                        ':active-deepest': '#c62828',
                        default: '#e57373',
                      },
                      transitionDuration: '150ms',
                    },
                  ]}>
                  <LayerLabel>Layer 2 (panel)</LayerLabel>
                  <Animated.View
                    style={[
                      styles.button,
                      {
                        backgroundColor: {
                          ':active-deepest': '#b71c1c',
                          default: '#e53935',
                        },
                        transform: {
                          ':active-deepest': [{ scale: 0.9 }],
                          default: [{ scale: 1 }],
                        },
                        transitionDuration: '120ms',
                      },
                    ]}
                    onStartShouldSetResponder={() => true}>
                    <Text style={{ color: colors.white }} variant="label3">
                      Press me
                    </Text>
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </View>
          </VerticalExampleCard>

          <VerticalExampleCard
            collapsedExampleHeight={180}
            title="Compare: :active propagates up"
            code={`
<Animated.View style={{ backgroundColor: { default: '#e8f4fd', ':active': '#bdddf7' }, ... }}>
  <Animated.View style={{ backgroundColor: { default: '#bbdefb', ':active': '#90caf9' }, ... }}>
    <Animated.View
      style={{
        backgroundColor: { default: '#1976d2', ':active': '#0d47a1' },
        transform: { default: [{ scale: 1 }], ':active': [{ scale: 0.9 }] },
      }}
    />
  </Animated.View>
</Animated.View>`}
            collapsedCode={`
backgroundColor: {
  default: '#1976d2',
  ':active': '#0d47a1',
},
transform: {
  default: [{ scale: 1 }],
  ':active': [{ scale: 0.9 }],
},`}>
            <View style={styles.nestedContainer}>
              <Animated.View
                style={[
                  styles.layer1,
                  {
                    backgroundColor: {
                      ':active': '#bdddf7',
                      default: '#e8f4fd',
                    },
                    borderColor: { ':active': '#1565c0', default: '#90caf9' },
                    transitionDuration: '150ms',
                  },
                ]}>
                <LayerLabel>Layer 1 (card)</LayerLabel>
                <Animated.View
                  style={[
                    styles.layer2,
                    {
                      backgroundColor: {
                        ':active': '#90caf9',
                        default: '#bbdefb',
                      },
                      borderColor: { ':active': '#0d47a1', default: '#64b5f6' },
                      transitionDuration: '150ms',
                    },
                  ]}>
                  <LayerLabel>Layer 2 (panel)</LayerLabel>
                  <Animated.View
                    style={[
                      styles.button,
                      {
                        backgroundColor: {
                          ':active': '#0d47a1',
                          default: '#1976d2',
                        },
                        transform: {
                          ':active': [{ scale: 0.9 }],
                          default: [{ scale: 1 }],
                        },
                        transitionDuration: '120ms',
                      },
                    ]}
                    onStartShouldSetResponder={() => true}>
                    <Text style={{ color: colors.white }} variant="label3">
                      Press me
                    </Text>
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </View>
          </VerticalExampleCard>
          <VerticalExampleCard
            collapsedExampleHeight={230}
            title="Mixed: :active and :active-deepest"
            code={`
<Animated.View style={{ backgroundColor: { default: '#e8f5e9', ':active': '#c8e6c9' }, ... }}>
  <Animated.View style={{ backgroundColor: { default: '#ffcdd2', ':active-deepest': '#ef9a9a' }, ... }}>
    <Animated.View style={{ backgroundColor: { default: '#e3f2fd', ':active': '#90caf9' }, ... }}>
      <Animated.View
        style={{
          backgroundColor: { default: '#e53935', ':active-deepest': '#b71c1c' },
          transform: { default: [{ scale: 1 }], ':active-deepest': [{ scale: 0.9 }] },
        }}
      />
    </Animated.View>
  </Animated.View>
</Animated.View>`}
            collapsedCode={`
backgroundColor: {
  default: '#e53935',
  ':active-deepest': '#b71c1c',
},
transform: {
  default: [{ scale: 1 }],
  ':active-deepest': [{ scale: 0.9 }],
},`}>
            <View style={styles.nestedContainer}>
              <Animated.View
                style={[
                  styles.layer1,
                  {
                    backgroundColor: {
                      ':active': '#c8e6c9',
                      default: '#e8f5e9',
                    },
                    borderColor: { ':active': '#2e7d32', default: '#a5d6a7' },
                    transitionDuration: '150ms',
                  },
                ]}>
                <LayerLabel>Layer 1 (:active)</LayerLabel>
                <Animated.View
                  style={[
                    styles.layer2,
                    {
                      backgroundColor: {
                        ':active-deepest': '#ef9a9a',
                        default: '#ffcdd2',
                      },
                      borderColor: {
                        ':active-deepest': '#c62828',
                        default: '#e57373',
                      },
                      transitionDuration: '150ms',
                    },
                  ]}>
                  <LayerLabel>Layer 2 (:active-deepest)</LayerLabel>
                  <Animated.View
                    style={[
                      styles.layer2,
                      {
                        backgroundColor: {
                          ':active': '#90caf9',
                          default: '#e3f2fd',
                        },
                        borderColor: {
                          ':active': '#0d47a1',
                          default: '#64b5f6',
                        },
                        transitionDuration: '150ms',
                      },
                    ]}>
                    <LayerLabel>Layer 3 (:active)</LayerLabel>
                    <Animated.View
                      style={[
                        styles.button,
                        {
                          backgroundColor: {
                            ':active-deepest': '#b71c1c',
                            default: '#e53935',
                          },
                          transform: {
                            ':active-deepest': [{ scale: 0.9 }],
                            default: [{ scale: 1 }],
                          },
                          transitionDuration: '120ms',
                        },
                      ]}
                      onStartShouldSetResponder={() => true}>
                      <Text style={{ color: colors.white }} variant="label3">
                        Layer 4 (:active-deepest)
                      </Text>
                    </Animated.View>
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </View>
          </VerticalExampleCard>
        </Section>

        <Section
          description="With SVG, ':active-deepest' resolves through the SvgView host's per-path hit-test, so only the topmost shape under the press activates - not the axis-aligned bounding box. (Android; iOS per-path deepest arbitration for SVG is a follow-up.)"
          title="SVG :active-deepest">
          <VerticalExampleCard
            collapsedCode={`// two overlapping circles, each ':active-deepest'`}
            description="Two equal circles overlapping in a lens region, both ':active-deepest'; the right circle is drawn on top. Pressing the overlap activates only the top (right) circle - proving per-path top-most arbitration, not bounding-box (both boxes cover the overlap). Each crescent activates only its own circle."
            title="Overlapping circles (deepest wins)"
            code={`<Svg>
  <AnimatedCircle ... style={{ fill: { default, ':active-deepest' } }} />
  <AnimatedCircle ... style={{ fill: { default, ':active-deepest' } }} />
</Svg>`}>
            <Svg height={sizes.md} width={sizes.xl}>
              <AnimatedCircle
                cx={sizes.md / 2 + 10}
                cy={sizes.md / 2}
                fill="#ffcdd2"
                r={sizes.md / 2 - 2}
                style={{
                  fill: {
                    ':active-deepest': '#ef9a9a',
                    default: '#ffcdd2',
                  },
                  transitionDuration: '200ms',
                }}
              />
              <AnimatedCircle
                cx={sizes.xl - sizes.md / 2 - 10}
                cy={sizes.md / 2}
                fill="#e53935"
                r={sizes.md / 2 - 2}
                style={{
                  fill: {
                    ':active-deepest': '#b71c1c',
                    default: '#e53935',
                  },
                  transitionDuration: '200ms',
                }}
              />
            </Svg>
          </VerticalExampleCard>
        </Section>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
  },
  content: {
    gap: spacing.xs,
  },
  layer1: {
    borderRadius: radius.md,
    borderWidth: 2,
    gap: spacing.xs,
    padding: spacing.sm,
    width: '100%',
  },
  layer2: {
    borderRadius: radius.sm,
    borderWidth: 2,
    gap: spacing.xs,
    padding: spacing.xs,
  },
  nestedContainer: {
    padding: spacing.xs,
    width: '100%',
  },
});
