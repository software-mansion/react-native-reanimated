import { StyleSheet } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { ExampleCardProps } from '@/components';
import {
  ScrollScreen,
  Section,
  TabView,
  VerticalExampleCard,
} from '@/components';
import { radius, sizes } from '@/theme';
import { formatAnimationCode } from '@/utils';

const sharedConfig: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '3s',
  animationIterationCount: 'infinite',
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
          title="RGB"
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
        />
        <Example
          title="RGBA"
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
          title="#RGB"
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
        />
        <Example
          title="#RGBA"
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
        />
        <Example
          title="#RRGGBB"
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
        />
        <Example
          title="#RRGGBBAA"
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
          title="HSL"
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
        />
        <Example
          title="HSLA"
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

type ExampleProps = {
  config: CSSAnimationConfig;
} & Omit<ExampleCardProps, 'code'>;

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
    borderRadius: radius.sm,
    height: sizes.xl,
    width: sizes.xl,
  },
});
