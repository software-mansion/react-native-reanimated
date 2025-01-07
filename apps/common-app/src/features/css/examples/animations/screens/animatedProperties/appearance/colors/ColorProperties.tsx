import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import type {
  CSSAnimationProperties,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { colors, radius, sizes, spacing } from '@/theme';
import { stringifyConfig } from '@/utils';
import type { ExampleCardProps } from '~/css/components';
import {
  Screen,
  Scroll,
  Section,
  TabView,
  VerticalExampleCard,
} from '~/css/components';

import splashImage from './images/splash.png';

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
        {/* TODO - uncomment when issue with RN warning is fixed */}
        {/* <TextExample
          animation={{
            animationName: {
              to: {
                textDecorationColor: 'cyan',
              },
            },
            ...sharedConfig,
          }}
          title="textDecorationColor"
        /> */}
        {/* TODO - uncomment when issue with RN warning is fixed */}
        {/* <TextExample
          animation={{
            animationName: {
              to: {
                textShadowColor: 'cyan',
              },
            },
            ...sharedConfig,
          }}
          title="textShadowColor"
        /> */}
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
          title="shadowColor"
          animation={{
            animationName: {
              '50%': {
                shadowColor: 'indigo',
              },
              from: {
                shadowColor: 'aqua',
              },
            },
            ...sharedConfig,
          }}
          style={{
            backgroundColor: colors.primary,
            shadowOpacity: 1,
            shadowRadius: spacing.sm,
          }}
        />
        <ImageExample
          title="overlayColor"
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

const ImageExample = (props: ConcreteExampleProps<ImageStyle>) => (
  <Example
    {...props}
    renderExample={(...styleProps) => (
      <Animated.Image
        source={splashImage}
        // TODO - fix tintColor (animation is applied only if this style
        // prop is listed in the view style and is not empty)
        style={[styles.box, ...styleProps, { tintColor: 'transparent' }]}
      />
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
