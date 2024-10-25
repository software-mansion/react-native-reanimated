import { StyleSheet } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import { ScrollScreen, Section, TabView } from '../../../../../components';
import { sizes, radius } from '../../../../../theme';
import Animated from 'react-native-reanimated';
import type { ExampleCardProps } from '../components';
import { VerticalExampleCard } from '../components';
import { formatAnimationCode } from '../../../../../utils';

const sharedConfig: CSSAnimationSettings = {
  animationIterationCount: 'infinite',
  animationDuration: '3s',
  animationDirection: 'alternate',
  animationTimingFunction: 'easeInOut',
};

export default function ColorsFormats() {
  return (
    <TabView>
      <TabView.Tab name="Predefined">
        <PredefinedColors />
      </TabView.Tab>
      <TabView.Tab name="RGB / RGBA">
        <RgbAndRgbaColors />
      </TabView.Tab>
      <TabView.Tab name="Hex">
        <HexColors />
      </TabView.Tab>
      <TabView.Tab name="HSL / HSLA">
        <HslAndHslaColors />
      </TabView.Tab>
      <TabView.Tab name="HWB">
        <HwbColors />
      </TabView.Tab>
    </TabView>
  );
}

function PredefinedColors() {
  return (
    <ScrollScreen>
      <Section title="Predefined Colors">
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: 'red',
              },
              to: {
                backgroundColor: 'cyan',
              },
            },
            ...sharedConfig,
          }}
        />
      </Section>
    </ScrollScreen>
  );
}

function RgbAndRgbaColors() {
  return (
    <ScrollScreen>
      <Section title="RGB and RGBA">
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: 'rgb(131, 191, 96)',
              },
              to: {
                backgroundColor: 'rgb(125, 44, 191)',
              },
            },
            ...sharedConfig,
          }}
          title="RGB"
        />
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: 'rgba(26, 15, 219, 0.2)',
              },
              to: {
                backgroundColor: 'rgba(26, 15, 219, 1.0)',
              },
            },
            ...sharedConfig,
          }}
          title="RGBA"
        />
      </Section>
    </ScrollScreen>
  );
}

function HexColors() {
  return (
    <ScrollScreen>
      <Section title="RGB and RGBA hex">
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: '#f8a',
              },
              to: {
                backgroundColor: '#9fb',
              },
            },
            ...sharedConfig,
          }}
          title="#RGB"
        />
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: '#f8a1',
              },
              to: {
                backgroundColor: '#f8af',
              },
            },
            ...sharedConfig,
          }}
          title="#RGBA"
        />
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: '#ff8812',
              },
              to: {
                backgroundColor: '#90f10c',
              },
            },
            ...sharedConfig,
          }}
          title="#RRGGBB"
        />
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: '#ff881211',
              },
              to: {
                backgroundColor: '#ff8812ff',
              },
            },
            ...sharedConfig,
          }}
          title="#RRGGBBAA"
        />
      </Section>
    </ScrollScreen>
  );
}

function HslAndHslaColors() {
  return (
    <ScrollScreen>
      <Section title="HSL and HSLA">
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: 'hsl(9, 28%, 46%)',
              },
              to: {
                backgroundColor: 'hsl(131, 33%, 48%)',
              },
            },
            ...sharedConfig,
          }}
          title="HSL"
        />
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: 'hsla(131, 33%, 48%, 0.1)',
              },
              to: {
                backgroundColor: 'hsla(131, 33%, 48%, 1)',
              },
            },
            ...sharedConfig,
          }}
          title="HSLA"
        />
      </Section>
    </ScrollScreen>
  );
}

function HwbColors() {
  return (
    <ScrollScreen>
      <Section title="HWB">
        <Example
          config={{
            animationName: {
              from: {
                backgroundColor: 'hwb(311, 15%, 15%)',
              },
              to: {
                backgroundColor: 'hwb(221, 25%, 42%)',
              },
            },
            ...sharedConfig,
          }}
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
    <VerticalExampleCard
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      {...cardProps}>
      <Animated.View style={[styles.box, config]} />
    </VerticalExampleCard>
  );
}

const styles = StyleSheet.create({
  box: {
    width: sizes.xl,
    height: sizes.xl,
    borderRadius: radius.sm,
  },
});
