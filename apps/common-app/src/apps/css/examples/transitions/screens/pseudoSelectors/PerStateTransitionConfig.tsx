import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Screen,
  Scroll,
  Section,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

export default function PerStateTransitionConfig() {
  return (
    <Screen>
      <Scroll contentContainerStyle={styles.content} withBottomBarSpacing>
        <Section
          description="Every transition* field accepts a scalar, an array (per-property), or a pseudo-keyed object that varies the timing per pseudo-selector state. The same selector's timing applies on entry AND on exit — hovering uses :hover's duration both ways."
          title="Pseudo-selector transition configs">
          <VerticalExampleCard
            collapsedCode={`transitionDuration: '300ms'`}
            title="Scalar duration (same for all states)"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryDark,
    },
    transitionDuration: '300ms',
  }}
/>`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: {
                    ':hover': colors.primaryDark,
                    default: colors.primary,
                  },
                  transitionDuration: '300ms',
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Array (per-property timing)"
            code={`<Animated.View
  style={{
    backgroundColor: { default: colors.primary, ':hover': colors.primaryDark },
    transform: {
      default: [{ scale: 1 }],
      ':hover': [{ scale: 1.2 }],
    },
    transitionProperty: ['backgroundColor', 'transform'],
    transitionDuration: ['600ms', '150ms'],
  }}
/>`}
            collapsedCode={`transitionProperty: ['backgroundColor', 'transform'],
transitionDuration: ['600ms', '150ms'],`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: {
                    ':hover': colors.primaryDark,
                    default: colors.primary,
                  },
                  transform: {
                    ':hover': [{ scale: 1.2 }],
                    default: [{ scale: 1 }],
                  },
                  transitionDuration: ['600ms', '150ms'],
                  transitionProperty: ['backgroundColor', 'transform'],
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            description="The selector whose state flips drives the transition. Both entering AND leaving :hover use ':hover''s 120ms — the 'default' branch only applies if some non-hover selector is involved."
            title="Per-state duration"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryDark,
    },
    transitionDuration: {
      default: '900ms',
      ':hover': '120ms',
    },
  }}
/>`}
            collapsedCode={`transitionDuration: {
  default: '900ms',
  ':hover': '120ms',
}`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: {
                    ':hover': colors.primaryDark,
                    default: colors.primary,
                  },
                  transitionDuration: {
                    ':hover': '120ms',
                    default: '900ms',
                  },
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Per-state timing function (ease-in vs ease-out)"
            code={`<Animated.View
  style={{
    transform: {
      default: [{ scale: 1 }],
      ':hover': [{ scale: 1.3 }],
    },
    transitionDuration: '500ms',
    transitionTimingFunction: {
      default: 'ease-in',
      ':hover': 'ease-out',
    },
  }}
/>`}
            collapsedCode={`transitionTimingFunction: {
  default: 'ease-in',
  ':hover': 'ease-out',
}`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: colors.primary,
                  transform: {
                    ':hover': [{ scale: 1.3 }],
                    default: [{ scale: 1 }],
                  },
                  transitionDuration: '500ms',
                  transitionTimingFunction: {
                    ':hover': 'ease-out',
                    default: 'ease-in',
                  },
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Per-state delay (instant in, delayed out)"
            code={`<Animated.View
  style={{
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryDark,
    },
    transitionDuration: '200ms',
    transitionDelay: {
      default: '500ms', // 500ms wait before starting to fade back
      ':hover': '0ms',
    },
  }}
/>`}
            collapsedCode={`transitionDelay: {
  default: '500ms',
  ':hover': '0ms',
}`}>
            <Animated.View
              style={[
                styles.box,
                {
                  backgroundColor: {
                    ':hover': colors.primaryDark,
                    default: colors.primary,
                  },
                  transitionDelay: {
                    ':hover': '0ms',
                    default: '500ms',
                  },
                  transitionDuration: '200ms',
                },
              ]}
            />
          </VerticalExampleCard>

          <VerticalExampleCard
            title="Per-state behavior (allow-discrete on hover only)"
            code={`<Animated.View
  style={{
    justifyContent: {
      default: 'flex-start',
      ':hover': 'flex-end',
    },
    transitionDuration: '1s',
    transitionTimingFunction: 'linear',
    transitionBehavior: {
      default: 'normal',
      ':hover': 'allow-discrete',
    },
  }}>
  {/* three children */}
</Animated.View>`}
            collapsedCode={`transitionBehavior: {
  default: 'normal',
  ':hover': 'allow-discrete',
}`}>
            <Animated.View
              style={[
                styles.behaviorTrack,
                {
                  justifyContent: {
                    ':hover': 'flex-end',
                    default: 'flex-start',
                  },
                  transitionBehavior: {
                    ':hover': 'allow-discrete',
                    default: 'normal',
                  },
                  transitionDuration: '1s',
                  transitionTimingFunction: 'linear',
                },
              ]}>
              <Animated.View style={styles.behaviorChip} />
              <Animated.View style={styles.behaviorChip} />
              <Animated.View style={styles.behaviorChip} />
            </Animated.View>
          </VerticalExampleCard>
        </Section>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  behaviorChip: {
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
    height: sizes.sm,
    width: sizes.xs,
  },
  behaviorTrack: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    flexDirection: 'row',
    height: sizes.sm,
    overflow: 'hidden',
    width: sizes.xxl,
  },
  box: {
    borderRadius: radius.md,
    height: sizes.md,
    width: sizes.md,
  },
  content: {
    gap: spacing.xs,
  },
});
