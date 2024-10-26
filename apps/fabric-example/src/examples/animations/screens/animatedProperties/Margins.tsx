import { ScrollScreen, Section, TabView } from '../../../../components';
import type { ExampleCardProps } from './components';
import { ExampleCard } from './components';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import { formatAnimationCode } from '../../../../utils';
import Animated from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { colors, radius, sizes, spacing } from '../../../../theme';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationDuration: '1s',
};

export default function Margins() {
  return (
    <TabView>
      <TabView.Tab name="Absolute">
        <AbsoluteMargins />
      </TabView.Tab>
      <TabView.Tab name="Relative">
        <RelativeMargins />
      </TabView.Tab>
      {/* <TabView.Tab name="Mixed">
        <MixedMargins />
      </TabView.Tab> */}
    </TabView>
  );
}

const SHARED_EXAMPLES = [
  {
    title: 'Margin',
    property: 'margin',
  },
  {
    title: 'Top Margin',
    property: 'marginTop',
  },
  {
    title: 'Right Margin',
    property: 'marginRight',
    description: '(or marginEnd)',
  },
  {
    title: 'Bottom Margin',
    property: 'marginBottom',
  },
  {
    title: 'Left Margin',
    property: 'marginLeft',
    description: '(or marginStart)',
  },
  {
    title: 'Horizontal Margin',
    property: 'marginHorizontal',
  },
  {
    title: 'Vertical Margin',
    property: 'marginVertical',
  },
];

function AbsoluteMargins() {
  return (
    <ScrollScreen>
      <Section title="Absolute Margins">
        {SHARED_EXAMPLES.map(({ title, property, description }) => (
          <Example
            key={title}
            config={{
              animationName: {
                to: {
                  [property]: spacing.md,
                },
              },
              ...SHARED_SETTINGS,
            }}
            description={description}
            title={title}
          />
        ))}
      </Section>
    </ScrollScreen>
  );
}

function RelativeMargins() {
  return (
    <ScrollScreen>
      <Section
        title="Relative Margins"
        description="Relative margins are a bit weird. Yoga doesn't apply them properly, thus they don't work the same as in CSS.">
        {SHARED_EXAMPLES.map(({ title, property, description }) => (
          <Example
            key={title}
            config={{
              animationName: {
                from: {
                  [property]: '10%',
                },
                to: {
                  [property]: '40%',
                },
              },
              ...SHARED_SETTINGS,
            }}
            description={description}
            title={title}
          />
        ))}
      </Section>
    </ScrollScreen>
  );
}

function MixedMargins() {
  return (
    <ScrollScreen>
      <Section title="Mixed Margins">
        <Example
          config={{
            animationName: {
              from: {
                margin: spacing.md,
              },
              to: {
                margin: '40%',
              },
            },
            ...SHARED_SETTINGS,
          }}
          title="Mixed Margins"
        />

        <Example
          config={{
            animationName: {
              from: {
                marginRight: 0,
              },
              '25%': {
                marginRight: '50%',
              },
              '50%': {
                marginRight: spacing.md,
              },
              '75%': {
                marginRight: '25%',
              },
              to: {
                marginRight: 0,
              },
            },
            ...SHARED_SETTINGS,
          }}
          title="Horizontal Margin"
        />
      </Section>
    </ScrollScreen>
  );
}

type ExampleProps = Omit<ExampleCardProps, 'code'> & {
  config: CSSAnimationConfig;
};

function Example({ config, ...cardProps }: ExampleProps) {
  return (
    <ExampleCard
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      {...cardProps}>
      <View style={styles.box} />
      <View style={styles.boxesRow}>
        <View style={styles.box} />
        <View style={styles.boxWrapper}>
          <Animated.View style={[styles.box, styles.animatedBox, config]} />
        </View>
        <View style={styles.box} />
      </View>
      <View style={styles.box} />
    </ExampleCard>
  );
}

const styles = StyleSheet.create({
  boxesRow: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    backgroundColor: colors.background3,
  },
  boxWrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  box: {
    backgroundColor: colors.primary,
    width: sizes.sm,
    height: sizes.sm,
    borderRadius: radius.sm,
  },
  animatedBox: {
    backgroundColor: colors.primaryDark,
  },
});
