import type { DimensionValue } from 'react-native';
import { StyleSheet } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import { ScrollScreen, Section, TabView } from '../../../../components';
import { sizes, colors, radius } from '../../../../theme';
import Animated from 'react-native-reanimated';
import type { ExampleCardProps } from './components';
import { ExampleCard, VerticalExampleCard } from './components';
import { formatAnimationCode } from '../../../../utils';

export default function Dimensions() {
  return (
    <TabView>
      <TabView.Tab name="Absolute">
        <AbsoluteDimensions />
      </TabView.Tab>
      <TabView.Tab name="Relative">
        <RelativeDimensions />
      </TabView.Tab>
      <TabView.Tab name="Mixed">
        <MixedDimensions />
      </TabView.Tab>
    </TabView>
  );
}

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationDuration: '1s',
};

const SHARED_EXAMPLES: {
  sectionTitle: string;
  examples: {
    title: string;
    property: string;
    width?: DimensionValue;
    height?: DimensionValue;
    description?: string;
  }[];
}[] = [
  {
    sectionTitle: 'Width',
    examples: [
      {
        title: 'Width',
        property: 'width',
      },
      {
        title: 'Min Width',
        property: 'minWidth',
        width: 75,
        description: 'When width is set to 75',
      },
      {
        title: 'Max Width',
        property: 'maxWidth',
        width: 75,
        description: 'When width is set to 75',
      },
    ],
  },
  {
    sectionTitle: 'Height',
    examples: [
      {
        title: 'Height',
        property: 'height',
      },
      {
        title: 'Min Height',
        property: 'minHeight',
        height: 75,
        description: 'When height is set to 75',
      },
      {
        title: 'Max Height',
        property: 'maxHeight',
        height: 75,
        description: 'When height is set to 75',
      },
    ],
  },
];

function AbsoluteDimensions() {
  return (
    <ScrollScreen>
      {SHARED_EXAMPLES.map(({ sectionTitle, examples }) => (
        <Section key={sectionTitle} title={sectionTitle}>
          {examples.map(({ title, property, width, height, description }) => (
            <Example
              key={title}
              config={{
                animationName: {
                  from: {
                    [property]: 50,
                  },
                  to: {
                    [property]: 100,
                  },
                },
                ...SHARED_SETTINGS,
              }}
              title={title}
              width={width}
              height={height}
              description={description}
            />
          ))}
        </Section>
      ))}
    </ScrollScreen>
  );
}

function RelativeDimensions() {
  return (
    <ScrollScreen>
      {SHARED_EXAMPLES.map(({ sectionTitle, examples }) => (
        <Section key={sectionTitle} title={sectionTitle}>
          {examples.map(({ title, property, width, height, description }) => (
            <Example
              key={title}
              config={{
                animationName: {
                  from: {
                    [property]: '25%',
                  },
                  to: {
                    [property]: '75%',
                  },
                },
                ...SHARED_SETTINGS,
              }}
              title={title}
              width={width}
              height={height}
              description={description}
            />
          ))}
        </Section>
      ))}
    </ScrollScreen>
  );
}

function MixedDimensions() {
  const sharedSettings: CSSAnimationSettings = {
    animationIterationCount: 'infinite',
    animationDuration: '3s',
  };

  return (
    <ScrollScreen>
      <Section title="Width">
        <Example
          CardComponent={VerticalExampleCard}
          config={{
            animationName: {
              '0%': {
                width: 25,
              },
              '25%': {
                width: '75%',
              },
              '50%': {
                width: 50,
              },
              '75%': {
                width: '25%',
              },
              '100%': {
                width: 25,
              },
            },
            ...sharedSettings,
          }}
          title="Width"
        />
      </Section>

      <Section title="Height">
        <Example
          config={{
            animationName: {
              '0%': {
                height: 25,
              },
              '25%': {
                height: '75%',
              },
              '50%': {
                height: 50,
              },
              '75%': {
                height: '25%',
              },
              '100%': {
                height: 25,
              },
            },
            ...sharedSettings,
          }}
          title="Width"
          collapsedExampleHeight={300}
        />
      </Section>
    </ScrollScreen>
  );
}

type ExampleProps = Omit<ExampleCardProps, 'code'> & {
  config: CSSAnimationConfig;
  CardComponent?: React.ComponentType<ExampleCardProps>;
  width?: DimensionValue;
  height?: DimensionValue;
};

function Example({
  config,
  width = sizes.md,
  height = sizes.md,
  CardComponent = ExampleCard,
  ...cardProps
}: ExampleProps) {
  return (
    <CardComponent
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      {...cardProps}>
      <Animated.View style={[styles.box, config, { width, height }]} />
    </CardComponent>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
});
