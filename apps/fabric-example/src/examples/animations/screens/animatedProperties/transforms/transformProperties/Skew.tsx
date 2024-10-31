import React from 'react';
import { StyleSheet } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { ExampleCardProps } from '@/components';
import { ExampleCard, ScrollScreen, Section } from '@/components';
import { colors, radius, sizes } from '@/theme';
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
    description: 'Skewing an element along the x-axis.',
    examples: [
      {
        from: [{ skewX: '0deg' }],
        title: 'skewX from 0° to 45°',
        to: [{ skewX: '45deg' }],
      },
      {
        from: [{ skewX: '0rad' }],
        title: 'skewX from 0 to -π/3',
        to: [{ skewX: `-${Math.PI / 3}rad` }],
      },
    ],
    title: 'X skew',
  },
  {
    description: 'Skewing an element along the y-axis.',
    examples: [
      {
        from: [{ skewY: '0deg' }],
        title: 'skewY from 0° to 45°',
        to: [{ skewY: '45deg' }],
      },
      {
        from: [{ skewY: '0rad' }],
        title: 'skewY from 0 to π/3',
        to: [{ skewY: `${Math.PI / 3}rad` }],
      },
    ],
    title: 'Y skew',
  },
];

export default function Skew() {
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
    animationDirection: 'alternate',
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
      <Animated.View style={[styles.box, config]} />
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
});
