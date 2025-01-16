import type {
  ImageProps,
  ImageStyle,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Platform, StyleSheet } from 'react-native';
import type {
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes, spacing } from '@/theme';
import { splashImage } from '~/css/assets';
import type { ExampleCardProps, LabelType } from '~/css/components';
import {
  Screen,
  Scroll,
  Section,
  TabView,
  VerticalExampleCard,
} from '~/css/components';
import { stringifyConfig } from '~/css/utils';

const sharedConfig: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '3s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'easeInOut',
};

export default function ColorProperties() {
  return (
    <Screen>
      <TabView>
        <TabView.Tab name="Background">
          <BackgroundColors />
        </TabView.Tab>
        <TabView.Tab name="Text">
          <TextColors />
        </TabView.Tab>
        <TabView.Tab name="Border">
          <BorderColors />
        </TabView.Tab>
        <TabView.Tab name="Other">
          <OtherColors />
        </TabView.Tab>
      </TabView>
    </Screen>
  );
}

function BackgroundColors() {
  return (
    <Scroll withBottomBarSpacing>
      <Section title="Background Colors">
        <ViewExample
          title="View backgroundColor"
          animation={{
            animationName: {
              '50%': {
                backgroundColor: 'cyan',
              },
              from: {
                backgroundColor: 'red',
              },
            },
            ...sharedConfig,
          }}
        />
        <TextExample
          title="Text backgroundColor"
          animation={{
            animationName: {
              '50%': {
                backgroundColor: 'cyan',
              },
              from: {
                backgroundColor: 'red',
              },
            },
            ...sharedConfig,
          }}
        />
      </Section>
    </Scroll>
  );
}

function TextColors() {
  return (
    <Scroll withBottomBarSpacing>
      <Section title="Text Colors">
        <TextExample
          title="color"
          animation={{
            animationName: {
              '50%': {
                color: 'gold',
              },
              from: {
                color: 'rosybrown',
              },
            },
            ...sharedConfig,
          }}
        />
        <TextExample
          labelTypes={['iOS', 'web']}
          style={{ textDecorationLine: 'underline' }}
          title="textDecorationColor"
          animation={{
            animationName: {
              from: {
                textDecorationColor: 'red',
              },
              to: {
                textDecorationColor: 'cyan',
              },
            },
            ...sharedConfig,
          }}
        />
        <TextExample
          title="textShadowColor"
          animation={{
            animationName: Platform.select({
              default: {
                from: {
                  textShadowColor: 'red',
                },
                to: {
                  textShadowColor: 'cyan',
                },
              },
              web: {
                from: {
                  textShadowColor: 'red',
                  textShadowRadius: 10,
                },
                to: {
                  textShadowColor: 'cyan',
                  textShadowRadius: 10,
                },
              },
            }),
            ...sharedConfig,
          }}
          style={{
            textShadowOffset: { height: 0, width: 0 },
            textShadowRadius: 10,
          }}
        />
      </Section>
    </Scroll>
  );
}

function BorderColors() {
  return (
    <Scroll withBottomBarSpacing>
      <Section title="Border Colors">
        <ViewExample
          style={{ borderWidth: spacing.md }}
          title="borderColor"
          animation={{
            animationName: {
              '50%': {
                borderColor: 'teal',
              },
              from: {
                borderColor: 'violet',
              },
            },
            ...sharedConfig,
          }}
        />
        <ViewExample
          description="(or borderBlockStartColor)"
          style={{ borderWidth: spacing.md }}
          title="borderTopColor"
          animation={{
            animationName: {
              '50%': {
                borderTopColor: 'teal',
              },
              from: {
                borderTopColor: 'violet',
              },
            },
            ...sharedConfig,
          }}
        />
        <ViewExample
          description="(or borderEndColor)"
          style={{ borderWidth: spacing.md }}
          title="borderRightColor"
          animation={{
            animationName: {
              '50%': {
                borderRightColor: 'teal',
              },
              from: {
                borderRightColor: 'violet',
              },
            },
            ...sharedConfig,
          }}
        />
        <ViewExample
          description="(or borderBlockEndColor)"
          style={{ borderWidth: spacing.md }}
          title="borderBottomColor"
          animation={{
            animationName: {
              '50%': {
                borderBottomColor: 'teal',
              },
              from: {
                borderBottomColor: 'violet',
              },
            },
            ...sharedConfig,
          }}
        />
        <ViewExample
          description="(or borderStartColor)"
          style={{ borderWidth: spacing.md }}
          title="borderLeftColor"
          animation={{
            animationName: {
              '50%': {
                borderLeftColor: 'teal',
              },
              from: {
                borderLeftColor: 'violet',
              },
            },
            ...sharedConfig,
          }}
        />
        <ViewExample
          style={{ borderWidth: spacing.md }}
          title="borderBlockColor"
          animation={{
            animationName: {
              '50%': {
                borderBlockColor: 'teal',
              },
              from: {
                borderBlockColor: 'violet',
              },
            },
            ...sharedConfig,
          }}
        />
      </Section>
    </Scroll>
  );
}

function OtherColors() {
  return (
    <Scroll withBottomBarSpacing>
      <Section title="Other Colors">
        <ViewExample
          labelTypes={['iOS', 'web']}
          title="shadowColor"
          animation={{
            animationName: Platform.select({
              default: {
                '50%': {
                  shadowColor: 'indigo',
                },
                from: {
                  shadowColor: 'aqua',
                },
              },
              web: {
                '50%': {
                  shadowColor: 'indigo',
                  shadowRadius: spacing.lg,
                },
                from: {
                  shadowColor: 'aqua',
                  shadowRadius: spacing.lg,
                },
              },
            }),
            ...sharedConfig,
          }}
          style={{
            backgroundColor: colors.primary,
            shadowOpacity: 1,
            shadowRadius: spacing.sm,
          }}
        />
        <ImageExample
          labelTypes={['iOS', 'Android']}
          source={splashImage}
          title="tintColor"
          animation={{
            animationName: {
              from: {
                tintColor: 'magenta',
              },
              to: {
                tintColor: 'green',
              },
            },
            ...sharedConfig,
          }}
          style={{
            overlayColor: colors.primary,
          }}
        />
      </Section>
    </Scroll>
  );
}

type ExampleProps<S> = {
  style?: S;
  labelTypes?: Array<LabelType>;
  animation: CSSAnimationProperties;
  renderExample: (animation: CSSAnimationProperties, style?: S) => JSX.Element;
} & Omit<ExampleCardProps, 'code'>;

function Example<S>({
  animation,
  renderExample,
  style,
  ...cardProps
}: ExampleProps<S>) {
  return (
    <VerticalExampleCard
      code={stringifyConfig(animation)}
      collapsedCode={stringifyConfig(animation.animationName, true)}
      {...cardProps}>
      {renderExample(animation, style)}
    </VerticalExampleCard>
  );
}

type ConcreteExampleProps<S> = Omit<ExampleProps<S>, 'renderExample'>;

const ViewExample = (props: ConcreteExampleProps<ViewStyle>) => (
  <Example
    {...props}
    renderExample={(...styleProps) => (
      <Animated.View style={[styles.box, ...styleProps]} />
    )}
  />
);

const TextExample = (props: ConcreteExampleProps<TextStyle>) => (
  <Example
    {...props}
    renderExample={(...styleProps) => (
      <Animated.Text style={[styles.text, ...styleProps]}>Text</Animated.Text>
    )}
  />
);

type ImageExampleProps = {
  source: ImageProps['source'];
} & ConcreteExampleProps<ImageStyle>;

const ImageExample = ({ source, ...props }: ImageExampleProps) => (
  <Example
    {...props}
    renderExample={(...styleProps) => (
      <Animated.Image source={source} style={[styles.box, ...styleProps]} />
    )}
  />
);

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm,
    height: sizes.xl,
    width: sizes.xl,
  },
  text: {
    borderRadius: radius.sm,
    fontSize: sizes.md,
  },
});
