import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { ExampleCardProps } from '@/components';
import { ExampleCard, ScrollScreen, Section } from '@/components';
import { colors, radius, sizes, spacing } from '@/theme';
import type { Transforms } from '@/types';
import { formatAnimationCode } from '@/utils';

const EXAMPLES: Array<{
  title: string;
  description?: string;
  examples: Array<{
    title: string;
    description?: string;
    from: Transforms;
    to: Transforms;
  }>;
}> = [
  {
    description:
      'Rotating an element around the z-axis. This rotation is also applied when using the `rotate` shorthand property.',
    examples: [
      {
        from: [{ rotate: '0deg' }],
        title: 'rotate from 0° to 360°',
        to: [{ rotate: '360deg' }],
      },
      {
        description:
          'The same as the previous example but using the `rotateZ` property.',
        from: [{ rotateZ: '0deg' }],
        title: 'rotateZ from 0° to 360°',
        to: [{ rotateZ: '360deg' }],
      },
      {
        description:
          'Rotating an element around the z-axis using **radians**. This example is **equivalent** to rotation **from 0° to 180°**.',
        from: [{ rotate: '0rad' }],
        title: 'rotate from 0 to π',
        to: [{ rotate: `${Math.PI}rad` }],
      },
      {
        description:
          'Rotating an element around the z-axis using **degrees** and **radians**. This example is **equivalent** to rotation **from 0° to 270°**.',
        from: [{ rotate: '0rad' }],
        title: 'rotate from 0π to 270°',
        to: [{ rotate: '270deg' }],
      },
    ],
    title: 'Z rotation',
  },
  {
    description: 'Rotating an element around the x-axis.',
    examples: [
      {
        from: [{ rotateX: '0deg' }],
        title: 'rotateX from 0° to 360°',
        to: [{ rotateX: '360deg' }],
      },
    ],
    title: 'X rotation',
  },
  {
    description: 'Rotating an element around the y-axis.',
    examples: [
      {
        from: [{ rotateY: '0deg' }],
        title: 'rotateY from 0° to 360°',
        to: [{ rotateY: '360deg' }],
      },
    ],
    title: 'Y rotation',
  },
];

export default function Rotate() {
  return (
    <ScrollScreen>
      {EXAMPLES.map(({ description, examples, title }) => {
        return (
          <Section description={description} key={title} title={title}>
            {examples.map((exampleProps) => {
              return <Example key={exampleProps.title} {...exampleProps} />;
            })}
          </Section>
        );
      })}
    </ScrollScreen>
  );
}

type ExampleProps = {
  from: Transforms;
  to: Transforms;
} & Omit<ExampleCardProps, 'code'>;

function Example({ from, to, ...cardProps }: ExampleProps) {
  const config: CSSAnimationConfig = {
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: {
      from: {
        transform: from,
      },
      to: {
        transform: to,
      },
    },
  };

  return (
    <ExampleCard
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      {...cardProps}>
      <Animated.View style={[styles.box, config]}>
        <View style={styles.dot} />
      </Animated.View>
    </ExampleCard>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  dot: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.full,
    height: sizes.xxxs,
    left: spacing.xxs,
    position: 'absolute',
    top: spacing.xxs,
    width: sizes.xxxs,
  },
});
