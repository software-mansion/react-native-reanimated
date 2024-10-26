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
import { ExampleCard } from './components';
import { formatAnimationCode } from '../../../../utils';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationDuration: '1s',
};

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

function AbsoluteDimensions() {
  return (
    <ScrollScreen>
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
          }}
          height={75}
          title="Max Height"
        />
      </Section>
    </ScrollScreen>
  );
}

function RelativeDimensions() {
  return (
    <ScrollScreen>
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
          }}
          height="50%"
          title="Max Height"
        />
      </Section>
    </ScrollScreen>
  );
}

function MixedDimensions() {
  return (
    <ScrollScreen>
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
            ...SHARED_SETTINGS,
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
            ...SHARED_SETTINGS,
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
  width?: DimensionValue;
  height?: DimensionValue;
};

function Example({
  config,
  width = sizes.md,
  height = sizes.md,
  ...cardProps
}: ExampleProps) {
  return (
    <ExampleCard
      code={formatAnimationCode(config)}
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
