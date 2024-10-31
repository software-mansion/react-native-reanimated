import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { ExampleCardProps } from '@/components';
import { ExampleCard, ScrollScreen, Section } from '@/components';
import { colors, flex, radius, sizes } from '@/theme';
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
      'Scales element along the **x** and **y** axis. Works the same as if the same scale value was applied to the `scaleX` and `scaleY` properties.',
    examples: [
      {
        from: [{ scale: 1 }],
        title: 'scale from 1 to 2',
        to: [{ scale: 2 }],
      },
      {
        from: [{ scale: 1 }],
        title: 'scale from 1 to 0.5',
        to: [{ scale: 0.5 }],
      },
    ],
    title: 'Scale',
  },
  {
    description: 'Scales element along the **x** axis.',
    examples: [
      {
        from: [{ scaleX: 1 }],
        title: 'scaleX from 1 to 2',
        to: [{ scaleX: 2 }],
      },
      {
        from: [{ scaleX: 1 }],
        title: 'scaleX from 1 to 0.5',
        to: [{ scaleX: 0.5 }],
      },
    ],
    title: 'X scale',
  },
  {
    description: 'Scales element along the **y** axis.',
    examples: [
      {
        from: [{ scaleY: 1 }],
        title: 'scaleY from 1 to 2',
        to: [{ scaleY: 2 }],
      },
      {
        from: [{ scaleY: 1 }],
        title: 'scaleY from 1 to 0.5',
        to: [{ scaleY: 0.5 }],
      },
    ],
    title: 'Y scale',
  },
];

export default function Scale() {
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
      <View style={flex.row}>
        <View style={styles.box} />
        <Animated.View
          style={[styles.box, { backgroundColor: colors.primaryDark }, config]}
        />
      </View>
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
