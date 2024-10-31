import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { ExampleCardProps } from '@/components';
import {
  ExampleCard,
  ScrollScreen,
  Section,
  TabView,
  VerticalExampleCard,
} from '@/components';
import { colors, radius, sizes, spacing } from '@/theme';
import { formatAnimationCode } from '@/utils';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

export default function Paddings() {
  return (
    <TabView>
      <TabView.Tab name="Absolute">
        <AbsolutePaddings />
      </TabView.Tab>
      <TabView.Tab name="Relative">
        <RelativePaddings />
      </TabView.Tab>
      <TabView.Tab name="Mixed">
        <MixedPaddings />
      </TabView.Tab>
    </TabView>
  );
}

const SHARED_EXAMPLES = [
  {
    property: 'padding',
    title: 'Padding',
  },
  {
    property: 'paddingTop',
    title: 'Top Padding',
  },
  {
    description: '(or paddingEnd)',
    property: 'paddingRight',
    title: 'Right Padding',
  },
  {
    property: 'paddingBottom',
    title: 'Bottom Padding',
  },
  {
    description: '(or paddingStart)',
    property: 'paddingLeft',
    title: 'Left Padding',
  },
  {
    property: 'paddingHorizontal',
    title: 'Horizontal Padding',
  },
  {
    property: 'paddingVertical',
    title: 'Vertical Padding',
  },
];

function AbsolutePaddings() {
  return (
    <ScrollScreen>
      <Section title="Absolute Padding">
        {SHARED_EXAMPLES.map(({ description, property, title }) => (
          <Example
            description={description}
            key={title}
            title={title}
            config={{
              animationName: {
                to: {
                  [property]: spacing.md,
                },
              },
              ...SHARED_SETTINGS,
            }}
          />
        ))}
      </Section>
    </ScrollScreen>
  );
}

function RelativePaddings() {
  return (
    <ScrollScreen>
      <Section
        description="All relative paddings are calculated based on the width of the parent element."
        title="Relative Padding">
        {SHARED_EXAMPLES.map(({ description, property, title }) => (
          <Example
            description={description}
            key={title}
            title={title}
            config={{
              animationName: {
                to: {
                  [property]: '25%',
                },
              },
              ...SHARED_SETTINGS,
            }}
          />
        ))}
      </Section>
    </ScrollScreen>
  );
}

function MixedPaddings() {
  const sharedSettings: CSSAnimationSettings = {
    animationDuration: '3s',
    animationIterationCount: 'infinite',
  };

  return (
    <ScrollScreen>
      <Section title="Mixed Padding">
        <Example
          CardComponent={VerticalExampleCard}
          title="Mixed Padding"
          config={{
            animationName: {
              '0%': {
                padding: 0,
              },
              '25%': {
                padding: '5%',
              },
              '50%': {
                padding: spacing.xxs,
              },
              '75%': {
                padding: '20%',
              },
              '100%': {
                padding: 0,
              },
            },
            ...sharedSettings,
          }}
        />
      </Section>
    </ScrollScreen>
  );
}

type ExampleProps = {
  config: CSSAnimationConfig;
  CardComponent?: React.ComponentType<ExampleCardProps>;
} & Omit<ExampleCardProps, 'code'>;

function Example({
  CardComponent = ExampleCard,
  config,
  ...cardProps
}: ExampleProps) {
  return (
    <CardComponent
      {...cardProps}
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}>
      <Animated.View style={[styles.box, config]}>
        <View style={styles.boxInner} />
      </Animated.View>
    </CardComponent>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    height: sizes.lg,
    width: sizes.lg,
  },
  boxInner: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: '100%',
    width: '100%',
  },
});
