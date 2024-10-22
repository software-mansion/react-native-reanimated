import { StyleSheet } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import { ScrollScreen, Section } from '../../../../components';
import { sizes, radius } from '../../../../theme';
import Animated from 'react-native-reanimated';
import type { ExampleCardProps } from './components';
import { VerticalExampleCard } from './components';
import { formatAnimationCode } from '../../../../utils';

export default function Colors() {
  const sharedConfig: CSSAnimationSettings = {
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationDuration: '4s',
  };

  return (
    <ScrollScreen>
      <Section title="Predefined colors">
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

export function Example({ config, ...cardProps }: ExampleProps) {
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
