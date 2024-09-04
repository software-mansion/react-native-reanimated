import type { DimensionValue } from 'react-native';
import { StyleSheet } from 'react-native';
import type { CSSAnimationConfig } from 'react-native-reanimated';
import type { ExampleCardProps } from '../../components';
import { ExampleCard, Section, TabView } from '../../components';
import { sizes, colors, radius } from '../../theme';
import Animated from 'react-native-reanimated';

export default function DimensionsExample() {
  return (
    <TabView>
      <TabView.Tab name="Absolute">
        <AbsoluteDimensionsExample />
      </TabView.Tab>
      <TabView.Tab name="Relative">
        <RelativeDimensionsExample />
      </TabView.Tab>
      <TabView.Tab name="Mixed">
        <MixedDimensionsExample />
      </TabView.Tab>
    </TabView>
  );
}

function AbsoluteDimensionsExample() {
  const sharedConfig: Omit<CSSAnimationConfig, 'animationName'> = {
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationDuration: '1s',
  };

  return (
    <>
      <Section title="Width">
        <Example
          config={{
            animationName: {
              from: {
                width: 50,
              },
              to: {
                width: 100,
              },
            },
            ...sharedConfig,
          }}
          title="Width"
        />

        <Example
          description="When width is set to 75"
          config={{
            animationName: {
              from: {
                minWidth: 50,
              },
              to: {
                minWidth: 100,
              },
            },
            ...sharedConfig,
          }}
          width={75}
          title="Min Width"
        />

        <Example
          description="When width is set to 75"
          config={{
            animationName: {
              from: {
                maxWidth: 50,
              },
              to: {
                maxWidth: 100,
              },
            },
            ...sharedConfig,
          }}
          width={75}
          title="Max Width"
        />
      </Section>

      <Section title="Height">
        <Example
          config={{
            animationName: {
              from: {
                height: 50,
              },
              to: {
                height: 100,
              },
            },
            ...sharedConfig,
          }}
          title="Height"
        />
        <Example
          description="When height is set to 75"
          config={{
            animationName: {
              from: {
                minHeight: 50,
              },
              to: {
                minHeight: 100,
              },
            },
            ...sharedConfig,
          }}
          height={75}
          title="Min Height"
        />
        <Example
          description="When height is set to 75"
          config={{
            animationName: {
              from: {
                maxHeight: 50,
              },
              to: {
                maxHeight: 100,
              },
            },
            ...sharedConfig,
          }}
          height={75}
          title="Max Height"
        />
      </Section>
    </>
  );
}

function RelativeDimensionsExample() {
  const sharedConfig: Omit<CSSAnimationConfig, 'animationName'> = {
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationDuration: '1s',
  };

  return (
    <>
      <Section title="Width">
        <Example
          config={{
            animationName: {
              from: {
                width: '25%',
              },
              to: {
                width: '75%',
              },
            },
            ...sharedConfig,
          }}
          title="Width"
        />

        <Example
          description="When width is set to 50%"
          config={{
            animationName: {
              from: {
                minWidth: '25%',
              },
              to: {
                minWidth: '75%',
              },
            },
            ...sharedConfig,
          }}
          width="50%"
          title="Min Width"
        />

        <Example
          description="When width is set to 50%"
          config={{
            animationName: {
              from: {
                maxWidth: '25%',
              },
              to: {
                maxWidth: '75%',
              },
            },
            ...sharedConfig,
          }}
          width="50%"
          title="Max Width"
        />
      </Section>

      <Section title="Height">
        <Example
          config={{
            animationName: {
              from: {
                height: '25%',
              },
              to: {
                height: '75%',
              },
            },
            ...sharedConfig,
          }}
          title="Height"
        />

        <Example
          description="When height is set to 50%"
          config={{
            animationName: {
              from: {
                minHeight: '25%',
              },
              to: {
                minHeight: '75%',
              },
            },
            ...sharedConfig,
          }}
          height="50%"
          title="Min Height"
        />

        <Example
          description="When height is set to 50%"
          config={{
            animationName: {
              from: {
                maxHeight: '25%',
              },
              to: {
                maxHeight: '75%',
              },
            },
            ...sharedConfig,
          }}
          height="50%"
          title="Max Height"
        />
      </Section>
    </>
  );
}

function MixedDimensionsExample() {
  const sharedConfig: Omit<CSSAnimationConfig, 'animationName'> = {
    animationIterationCount: 'infinite',
    animationDuration: '2.5s',
  };

  return (
    <>
      <Section title="Width">
        <Example
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
            ...sharedConfig,
          }}
          title="Width"
          collapsedExampleHeight={300}
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
            ...sharedConfig,
          }}
          title="Width"
          collapsedExampleHeight={300}
        />
      </Section>
    </>
  );
}

type ExampleProps = Omit<ExampleCardProps, 'code'> & {
  config: CSSAnimationConfig;
  width?: DimensionValue;
  height?: DimensionValue;
};

export function Example({
  config,
  width = sizes.md,
  height = sizes.md,
  ...cardProps
}: ExampleProps) {
  return (
    <ExampleCard
      code={JSON.stringify(config, null, 2)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      {...cardProps}>
      <Animated.View style={[styles.box, config, { width, height }]} />
    </ExampleCard>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
});
