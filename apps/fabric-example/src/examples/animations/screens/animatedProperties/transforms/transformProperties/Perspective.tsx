import { StyleSheet, Text } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { ExampleCardProps } from '@/components';
import { ScrollScreen, Section, VerticalExampleCard } from '@/components';
import { colors, flex, sizes } from '@/theme';
import { formatAnimationCode } from '@/utils';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '3s',
  animationIterationCount: 'infinite',
};

export default function Perspective() {
  return (
    <ScrollScreen>
      <Section
        title="Positive Perspective"
        description="Perspective is applied only to transformations listed after
        it in the `transform` property array. It is used to give depth to the
        **3D transformations**.">
        <Example
          num={21}
          title="With X rotation"
          config={{
            animationName: {
              from: {
                transform: [{ perspective: 10 }, { rotateX: '15deg' }],
              },
              to: {
                transform: [{ perspective: 50 }, { rotateX: '15deg' }],
              },
            },
            ...SHARED_SETTINGS,
          }}
        />

        <Example
          num={37}
          title="With Y rotation"
          config={{
            animationName: {
              from: {
                transform: [{ perspective: 20 }, { rotateY: '30deg' }],
              },
              to: {
                transform: [{ perspective: 100 }, { rotateY: '30deg' }],
              },
            },
            ...SHARED_SETTINGS,
          }}
        />
      </Section>

      <Section
        title="Zero Perspective"
        description="The **default perspective** value is **0**, which means that there
        is no perspective applied. If you want to animate perspective, **make sure
        to set a value greater than 0 in all keyframes**. The example below shows
        that the perspective **is not animated** when not explicitly set to the
        perspective value.">
        <Example
          num={73}
          title="Without perspective"
          config={{
            animationName: {
              from: {
                transform: [{ rotateY: '30deg' }],
              },
              to: {
                transform: [{ perspective: 100 }, { rotateY: '30deg' }],
              },
            },
            ...SHARED_SETTINGS,
          }}
        />
      </Section>

      <Section
        title="Negative Perspective"
        description="Negative perspective values are allowed. They **invert** the
        view transformation relative to the **transformation origin** (e.g.
        invert the rotation direction).">
        <Example
          num={12}
          title="With X rotation"
          config={{
            animationName: {
              from: {
                transform: [{ perspective: -20 }, { rotateY: '30deg' }],
              },
              to: {
                transform: [{ perspective: -100 }, { rotateY: '30deg' }],
              },
            },
            ...SHARED_SETTINGS,
          }}
        />
      </Section>
    </ScrollScreen>
  );
}

type ExampleProps = {
  config: CSSAnimationConfig;
  num: number;
} & Omit<ExampleCardProps, 'code'>;

function Example({ config, num, ...cardProps }: ExampleProps) {
  return (
    <VerticalExampleCard
      {...cardProps}
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}>
      <Animated.View style={[styles.box, config]}>
        <Text style={styles.number}>{num}</Text>
      </Animated.View>
    </VerticalExampleCard>
  );
}

const styles = StyleSheet.create({
  box: {
    ...flex.center,
    backgroundColor: colors.primary,
    height: sizes.lg,
    width: sizes.lg,
  },
  number: {
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
});
