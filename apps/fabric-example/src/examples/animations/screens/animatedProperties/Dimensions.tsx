import type { DimensionValue } from 'react-native';
import { StyleSheet } from 'react-native';
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
import { colors, radius, sizes } from '@/theme';
import { formatAnimationCode } from '@/utils';

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
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

const SHARED_EXAMPLES: Array<{
  sectionTitle: string;
  examples: Array<{
    title: string;
    property: string;
    width?: DimensionValue;
    height?: DimensionValue;
    description?: string;
  }>;
}> = [
  {
    examples: [
      {
        property: 'width',
        title: 'Width',
      },
      {
        description: 'When width is set to 75',
        property: 'minWidth',
        title: 'Min Width',
        width: 75,
      },
      {
        description: 'When width is set to 75',
        property: 'maxWidth',
        title: 'Max Width',
        width: 75,
      },
    ],
    sectionTitle: 'Width',
  },
  {
    examples: [
      {
        property: 'height',
        title: 'Height',
      },
      {
        description: 'When height is set to 75',
        height: 75,
        property: 'minHeight',
        title: 'Min Height',
      },
      {
        description: 'When height is set to 75',
        height: 75,
        property: 'maxHeight',
        title: 'Max Height',
      },
    ],
    sectionTitle: 'Height',
  },
];

function AbsoluteDimensions() {
  return (
    <ScrollScreen>
      {SHARED_EXAMPLES.map(({ examples, sectionTitle }) => (
        <Section key={sectionTitle} title={sectionTitle}>
          {examples.map(({ description, height, property, title, width }) => (
            <Example
              description={description}
              height={height}
              key={title}
              title={title}
              width={width}
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
      {SHARED_EXAMPLES.map(({ examples, sectionTitle }) => (
        <Section key={sectionTitle} title={sectionTitle}>
          {examples.map(({ description, height, property, title, width }) => (
            <Example
              description={description}
              height={height}
              key={title}
              title={title}
              width={width}
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
            />
          ))}
        </Section>
      ))}
    </ScrollScreen>
  );
}

function MixedDimensions() {
  const sharedSettings: CSSAnimationSettings = {
    animationDuration: '3s',
    animationIterationCount: 'infinite',
  };

  return (
    <ScrollScreen>
      <Section title="Width">
        <Example
          CardComponent={VerticalExampleCard}
          title="Width"
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
        />
      </Section>

      <Section title="Height">
        <Example
          collapsedExampleHeight={300}
          title="Width"
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
        />
      </Section>
    </ScrollScreen>
  );
}

type ExampleProps = {
  config: CSSAnimationConfig;
  CardComponent?: React.ComponentType<ExampleCardProps>;
  width?: DimensionValue;
  height?: DimensionValue;
} & Omit<ExampleCardProps, 'code'>;

function Example({
  CardComponent = ExampleCard,
  config,
  height = sizes.md,
  width = sizes.md,
  ...cardProps
}: ExampleProps) {
  return (
    <CardComponent
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      {...cardProps}>
      <Animated.View style={[styles.box, config, { height, width }]} />
    </CardComponent>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
});
