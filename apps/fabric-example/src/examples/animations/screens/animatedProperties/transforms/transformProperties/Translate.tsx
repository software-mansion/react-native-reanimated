import React from 'react';
import { StyleSheet } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { ExampleCardProps } from '@/components';
import { ExampleCard, ScrollScreen, Section, TabView } from '@/components';
import { colors, radius, sizes } from '@/theme';
import type { Transforms } from '@/types';
import { formatAnimationCode } from '@/utils';

export default function Translate() {
  return (
    <TabView>
      <TabView.Tab name="Absolute">
        <ExamplesScreen examples={ABSOLUTE_EXAMPLES} />
      </TabView.Tab>
      <TabView.Tab name="Relative">
        <ExamplesScreen examples={RELATIVE_EXAMPLES} />
      </TabView.Tab>
      <TabView.Tab name="Mixed">
        <ExamplesScreen examples={MIXED_EXAMPLES} />
      </TabView.Tab>
    </TabView>
  );
}

type Examples = Array<{
  title: string;
  description?: string;
  examples: Array<{
    title: string;
    from: Transforms;
    to: Transforms;
    description?: string;
  }>;
}>;

const ABSOLUTE_EXAMPLES: Examples = [
  {
    description: 'Translating an element along the x-axis.',
    examples: [
      {
        from: [{ translateX: 0 }],
        title: 'translateX from 0 to 100',
        to: [{ translateX: 100 }],
      },
    ],
    title: 'X translation',
  },
  {
    description: 'Translating an element along the y-axis.',
    examples: [
      {
        from: [{ translateY: 0 }],
        title: 'translateY from 0 to 100',
        to: [{ translateY: 100 }],
      },
    ],
    title: 'Y translation',
  },
  {
    description: 'Both translations combined.',
    examples: [
      {
        from: [{ translateX: 0 }, { translateY: 0 }],
        title: 'translateX and translateY from 0 to 100',
        to: [{ translateX: 100 }, { translateY: 100 }],
      },
    ],
    title: 'XY translation',
  },
];

const RELATIVE_EXAMPLES: Examples = [
  {
    description:
      'Translating an element along the x-axis. The value is **relative to** the element `width`.',
    examples: [
      {
        from: [{ translateX: '0%' }],
        title: 'translateX from 0% to 100%',
        to: [{ translateX: '100%' }],
      },
    ],
    title: 'X translation',
  },
  {
    description:
      'Translating an element along the y-axis. The value is **relative to** the element `height`.',
    examples: [
      {
        from: [{ translateY: '0%' }],
        title: 'translateY from 0% to 100%',
        to: [{ translateY: '100%' }],
      },
    ],
    title: 'Y translation',
  },
  {
    description: 'Both translations combined.',
    examples: [
      {
        from: [{ translateX: '0%' }, { translateY: '0%' }],
        title: 'translateX and translateY from 0% to 100%',
        to: [{ translateX: '100%' }, { translateY: '100%' }],
      },
    ],
    title: 'XY translation',
  },
];

const MIXED_EXAMPLES: Examples = [
  {
    description:
      'Translating between pixels and percentages. The percentage value is **relative to** the element `width`.',
    examples: [
      {
        from: [{ translateX: 25 }],
        title: 'translateX from 25 to -100%',
        to: [{ translateX: '-100%' }],
      },
    ],
    title: 'X translation',
  },
  {
    description:
      'Translating between pixels and percentages. The percentage value is **relative to** the element `height`.',
    examples: [
      {
        from: [{ translateY: 25 }],
        title: 'translateY from 25 to -100%',
        to: [{ translateY: '-100%' }],
      },
    ],
    title: 'Y translation',
  },
  {
    description: 'Both translations combined.',
    examples: [
      {
        from: [{ translateX: '-100%' }, { translateY: 25 }],
        title: 'translateX and translateY',
        to: [{ translateX: 25 }, { translateY: '-100%' }],
      },
    ],
    title: 'XY translation',
  },
];

type ExamplesScreenProps = {
  examples: Examples;
};

function ExamplesScreen({ examples }: ExamplesScreenProps) {
  return (
    <ScrollScreen>
      {examples.map(({ description, examples: sectionExamples, title }) => (
        <Section description={description} key={title} title={title}>
          {sectionExamples.map((exampleProps) => (
            <Example key={exampleProps.title} {...exampleProps} />
          ))}
        </Section>
      ))}
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
