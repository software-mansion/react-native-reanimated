import { colors, radius, sizes, spacing } from '../../../../theme';
import { ScrollScreen, Section, TabView } from '../../../../components';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import type { ExampleCardProps } from './components';
import { ExampleCard, VerticalExampleCard } from './components';
import { formatAnimationCode } from '../../../../utils';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationDuration: '1s',
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
    title: 'Padding',
    property: 'padding',
  },
  {
    title: 'Top Padding',
    property: 'paddingTop',
  },
  {
    title: 'Right Padding',
    property: 'paddingRight',
    description: '(or paddingEnd)',
  },
  {
    title: 'Bottom Padding',
    property: 'paddingBottom',
  },
  {
    title: 'Left Padding',
    property: 'paddingLeft',
    description: '(or paddingStart)',
  },
  {
    title: 'Horizontal Padding',
    property: 'paddingHorizontal',
  },
  {
    title: 'Vertical Padding',
    property: 'paddingVertical',
  },
];

function AbsolutePaddings() {
  return (
    <ScrollScreen>
      <Section title="Absolute Padding">
        {SHARED_EXAMPLES.map(({ title, property, description }) => (
          <Example
            key={title}
            title={title}
            description={description}
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
        title="Relative Padding"
        description="All relative paddings are calculated based on the width of the parent element.">
        {SHARED_EXAMPLES.map(({ title, property, description }) => (
          <Example
            key={title}
            title={title}
            description={description}
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
    animationIterationCount: 'infinite',
    animationDuration: '3s',
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

type ExampleProps = Omit<ExampleCardProps, 'code'> & {
  config: CSSAnimationConfig;
  CardComponent?: React.ComponentType<ExampleCardProps>;
};

function Example({
  config,
  CardComponent = ExampleCard,
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
    width: '100%',
    height: '100%',
  },
});
