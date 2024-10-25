import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import { ScrollScreen, Section, TabView } from '../../../../../components';
import type { ExampleCardProps } from '../components';
import { VerticalExampleCard } from '../components';
import { formatAnimationCode } from '../../../../../utils';
import Animated from 'react-native-reanimated';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { colors, radius, sizes, spacing } from '../../../../../theme';

const sharedConfig: CSSAnimationSettings = {
  animationIterationCount: 'infinite',
  animationDuration: '3s',
  animationDirection: 'alternate',
  animationTimingFunction: 'easeInOut',
};

export default function ColorProperties() {
  return (
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
  );
}

function BackgroundColors() {
  return (
    <ScrollScreen>
      <Section title="Background Colors">
        <ViewExample
          config={{
            animationName: {
              from: {
                backgroundColor: 'red',
              },
              '50%': {
                backgroundColor: 'cyan',
              },
            },
            ...sharedConfig,
          }}
          title="View backgroundColor"
        />
        <TextExample
          config={{
            animationName: {
              from: {
                backgroundColor: 'red',
              },
              '50%': {
                backgroundColor: 'cyan',
              },
            },
            ...sharedConfig,
          }}
          title="Text backgroundColor"
        />
      </Section>
    </ScrollScreen>
  );
}

function TextColors() {
  return (
    <ScrollScreen>
      <Section title="Text Colors">
        <TextExample
          config={{
            animationName: {
              from: {
                color: 'rosybrown',
              },
              '50%': {
                color: 'gold',
              },
            },
            ...sharedConfig,
          }}
          title="color"
        />
        {/* TODO - uncomment when issue with RN warning is fixed */}
        {/* <TextExample
          config={{
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
          config={{
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
    </ScrollScreen>
  );
}

function BorderColors() {
  return (
    <ScrollScreen>
      <Section title="Border Colors">
        <ViewExample
          style={{ borderWidth: spacing.md }}
          config={{
            animationName: {
              from: {
                borderColor: 'violet',
              },
              '50%': {
                borderColor: 'teal',
              },
            },
            ...sharedConfig,
          }}
          title="borderColor"
        />
        <ViewExample
          style={{ borderWidth: spacing.md }}
          config={{
            animationName: {
              from: {
                borderTopColor: 'violet',
              },
              '50%': {
                borderTopColor: 'teal',
              },
            },
            ...sharedConfig,
          }}
          title="borderTopColor"
          description="(or borderBlockStartColor)"
        />
        <ViewExample
          style={{ borderWidth: spacing.md }}
          config={{
            animationName: {
              from: {
                borderRightColor: 'violet',
              },
              '50%': {
                borderRightColor: 'teal',
              },
            },
            ...sharedConfig,
          }}
          title="borderRightColor"
          description="(or borderEndColor)"
        />
        <ViewExample
          style={{ borderWidth: spacing.md }}
          config={{
            animationName: {
              from: {
                borderBottomColor: 'violet',
              },
              '50%': {
                borderBottomColor: 'teal',
              },
            },
            ...sharedConfig,
          }}
          title="borderBottomColor"
          description="(or borderBlockEndColor)"
        />
        <ViewExample
          style={{ borderWidth: spacing.md }}
          config={{
            animationName: {
              from: {
                borderLeftColor: 'violet',
              },
              '50%': {
                borderLeftColor: 'teal',
              },
            },
            ...sharedConfig,
          }}
          title="borderLeftColor"
          description="(or borderStartColor)"
        />
        <ViewExample
          style={{ borderWidth: spacing.md }}
          config={{
            animationName: {
              from: {
                borderBlockColor: 'violet',
              },
              '50%': {
                borderBlockColor: 'teal',
              },
            },
            ...sharedConfig,
          }}
          title="borderBlockColor"
        />
      </Section>
    </ScrollScreen>
  );
}

function OtherColors() {
  return (
    <ScrollScreen>
      <Section title="Other Colors">
        <ViewExample
          style={{
            shadowRadius: spacing.sm,
            backgroundColor: colors.primary,
            shadowOpacity: 1,
          }}
          config={{
            animationName: {
              from: {
                shadowColor: 'aqua',
              },
              '50%': {
                shadowColor: 'indigo',
              },
            },
            ...sharedConfig,
          }}
          title="shadowColor"
        />
        <ImageExample
          style={{
            overlayColor: colors.primary,
          }}
          config={{
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
          title="overlayColor"
        />
      </Section>
    </ScrollScreen>
  );
}

type ExampleProps<S> = Omit<ExampleCardProps, 'code'> & {
  style?: S;
  config: CSSAnimationConfig;
  renderExample: (config: CSSAnimationConfig, style?: S) => JSX.Element;
};

function Example<S>({
  config,
  renderExample,
  style,
  ...cardProps
}: ExampleProps<S>) {
  return (
    <VerticalExampleCard
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      {...cardProps}>
      {renderExample(config, style)}
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
        source={require('./images/splash.png')}
        // TODO - fix tintColor (animation is applied only if this style
        // prop is listed in the view style and is not empty)
        style={[styles.box, ...styleProps, { tintColor: 'transparent' }]}
      />
    )}
  />
);

const styles = StyleSheet.create({
  box: {
    width: sizes.xl,
    height: sizes.xl,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: sizes.md,
    borderRadius: radius.sm,
  },
});
