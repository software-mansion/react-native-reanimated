import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { ScrollScreen, Section, TabView } from '../../../../../../components';
import { VerticalExampleCard } from '../../components';
import type { ExampleCardProps } from '../../components';
import Animated, { normalizeTransformOrigin } from 'react-native-reanimated';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import { formatAnimationCode } from '../../../../../../utils';
import { colors, radius, sizes } from '../../../../../../theme';

export default function TransformOrigin() {
  return (
    <TabView>
      <TabView.Tab name="Keywords">
        <ExamplesScreen examples={KEYWORD_EXAMPLES} />
      </TabView.Tab>
      <TabView.Tab name="Absolute">
        <ExamplesScreen examples={ABSOLUTE_EXAMPLES} />
      </TabView.Tab>
      <TabView.Tab name="Relative">
        <ExamplesScreen examples={RELATIVE_EXAMPLES} />
      </TabView.Tab>
      <TabView.Tab name="Mixed">
        <ExamplesScreen examples={MIXED_EXAMPLES} />
      </TabView.Tab>
    </TabView>
  );
}

type TransformOrigin = ViewStyle['transformOrigin'];

type Examples = {
  title: string;
  description?: string;
  examples: {
    title: string;
    transformOrigins: TransformOrigin[];
    description?: string;
  }[];
}[];

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
  animationDuration: '3s',
};

const KEYWORD_EXAMPLES: Examples = [
  {
    title: 'Single value',
    description:
      'When transform origin is a single keyword value. It is applied only to one axis (`right` and `left` to the **x axis**, `top` and `bottom` to the **y axis**, and `center` to both). The second axis is set to `center` by default.',
    examples: [
      {
        title: 'Vertical',
        transformOrigins: ['top', 'bottom'],
      },
      {
        title: 'Horizontal',
        transformOrigins: ['left', 'right'],
      },
      {
        title: 'Through center',
        transformOrigins: ['left', 'center', 'center', 'top'],
      },
    ],
  },
  {
    title: 'Two values',
    description:
      'When transform origin is a combination of two keyword values. The `top`/`bottom` value is applied to the **y axis** and the `left`/`right` value is applied to the **x axis**. `center` is applied to the **x axis** if is used as the first value or to the **y axis** if is used as the second value.',
    examples: [
      {
        title: 'Top left to bottom right',
        transformOrigins: ['top left', 'bottom right'],
      },
      {
        title: 'Bottom left to top right',
        transformOrigins: ['bottom left', 'top right'],
      },
      {
        title: 'Through center',
        transformOrigins: ['left top', 'center', 'right top'],
      },
    ],
  },
];

const ABSOLUTE_EXAMPLES: Examples = [
  {
    title: 'Single value',
    description:
      'Single value specified in pixels (or as a number). It is applied only to the **x axis**. The second axis is set to `center` by default.',
    examples: [
      {
        title: 'As a pixels string',
        transformOrigins: ['10px', '100px'],
      },
      {
        title: 'As a number',
        transformOrigins: [[-50], [100]],
      },
    ],
  },
  {
    title: 'Two values',
    description:
      'Two values specified in pixels (or as a number). The first value is applied to the **x axis** and the second value is applied to the **y axis**.',
    examples: [
      {
        title: 'Pixels to pixels',
        transformOrigins: ['-50px -10px', '120px 60px'],
      },
      {
        title: 'Mixed units',
        transformOrigins: [
          [120, '-20px'],
          ['-50px', 60],
        ],
      },
    ],
  },
];

const RELATIVE_EXAMPLES: Examples = [
  {
    title: 'Single value',
    description:
      'Single value specified in percentage. It is applied only to the **x axis** and is relative to the **width** of the element. The second axis is set to `center` by default.',
    examples: [
      {
        title: 'As a percentage string',
        transformOrigins: ['-50%', '100%'],
      },
    ],
  },
  {
    title: 'Two values',
    description:
      'Two values specified in percentage. The first value is applied to the **x axis** and is relative to the **width** of the element. The second value is applied to the **y axis** and is relative to the **height** of the element.',
    examples: [
      {
        title: 'Percentage to percentage',
        transformOrigins: ['-50% -50%', '100% 100%'],
      },
    ],
  },
];

const MIXED_EXAMPLES: Examples = [
  {
    title: 'Single value',
    description:
      'Single value specified in pixels, as a number, in percentage, or as a keyword.',
    examples: [
      {
        title: 'Mixed values',
        transformOrigins: ['-75px', '50%', [-25], 'center'],
      },
    ],
  },
  {
    title: 'Two values',
    description:
      'Two values specified in pixels, as a number, in percentage, or as a keyword.',
    examples: [
      {
        title: 'Mixed values',
        transformOrigins: [
          '-50px 50%',
          [50, 0],
          'center bottom',
          '125%   bottom',
        ],
      },
    ],
  },
];

type ExamplesScreenProps = {
  examples: Examples;
};

function ExamplesScreen({ examples }: ExamplesScreenProps) {
  return (
    <ScrollScreen>
      {examples.map(
        ({
          title: sectionTitle,
          description: sectionDescription,
          examples: sectionExamples,
        }) => (
          <Section
            title={sectionTitle}
            key={sectionTitle}
            description={sectionDescription}>
            {sectionExamples.map(({ title, transformOrigins, description }) => (
              <Example
                key={title}
                title={title}
                transformOrigins={transformOrigins}
                description={description}
              />
            ))}
          </Section>
        )
      )}
    </ScrollScreen>
  );
}

type ExampleProps = Omit<ExampleCardProps, 'code'> & {
  transformOrigins: TransformOrigin[];
};

const calculateOffset = (index: number, step: number) => {
  const offset = index * step;
  return `${offset.toFixed(offset === Math.round(offset) ? 0 : 2)}%`;
};

function Example({ transformOrigins, ...cardProps }: ExampleProps) {
  const step =
    transformOrigins.length < 2 ? 100 : 100 / (transformOrigins.length - 1);
  const boxAnimation: CSSAnimationConfig = {
    animationName: Object.fromEntries(
      transformOrigins.map((origin, index) => {
        return [
          calculateOffset(index, step),
          {
            transformOrigin: origin,
            transform: [{ rotate: `${index * 360}deg` }],
          },
        ];
      })
    ),
    ...SHARED_SETTINGS,
  };
  const originDotAnimation: CSSAnimationConfig = {
    animationName: Object.fromEntries(
      transformOrigins.map((origin, index) => {
        const [x, y] = normalizeTransformOrigin(origin!);
        return [
          calculateOffset(index, step),
          {
            top: y,
            left: x,
            transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
          },
        ];
      })
    ),
    ...SHARED_SETTINGS,
  };

  return (
    <VerticalExampleCard
      {...cardProps}
      collapsedCode={JSON.stringify(boxAnimation.animationName, null, 2)}
      code={formatAnimationCode(boxAnimation)}>
      <Animated.View style={[styles.box, boxAnimation]}>
        <Animated.View style={[styles.originDot, originDotAnimation]} />
      </Animated.View>
    </VerticalExampleCard>
  );
}

const styles = StyleSheet.create({
  box: {
    width: sizes.md,
    height: sizes.md,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  originDot: {
    position: 'absolute',
    backgroundColor: colors.primaryDark,
    width: sizes.xxxs,
    height: sizes.xxxs,
    borderRadius: radius.full,
  },
});
