import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Screen,
  Scroll,
  Section,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, radius, sizes, spacing } from '@/theme';

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
