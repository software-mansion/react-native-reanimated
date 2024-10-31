import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { ExampleCardProps } from '@/components';
import { ExampleCard, ScrollScreen, Section, TabView } from '@/components';
import { colors, radius, sizes, spacing } from '@/theme';
import { formatAnimationCode } from '@/utils';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

export default function Margins() {
  return (
    <TabView>
      <TabView.Tab name="Absolute">
        <AbsoluteMargins />
      </TabView.Tab>
      <TabView.Tab name="Relative">
        <RelativeMargins />
      </TabView.Tab>
      {/* <TabView.Tab name="Mixed">
        <MixedMargins />
      </TabView.Tab> */}
    </TabView>
  );
}

const SHARED_EXAMPLES = [
  {
    property: 'margin',
    title: 'Margin',
  },
  {
    property: 'marginTop',
    title: 'Top Margin',
  },
  {
    description: '(or marginEnd)',
    property: 'marginRight',
    title: 'Right Margin',
  },
  {
    property: 'marginBottom',
    title: 'Bottom Margin',
  },
  {
    description: '(or marginStart)',
    property: 'marginLeft',
    title: 'Left Margin',
  },
  {
    property: 'marginHorizontal',
    title: 'Horizontal Margin',
  },
  {
    property: 'marginVertical',
    title: 'Vertical Margin',
  },
];

function AbsoluteMargins() {
  return (
    <ScrollScreen>
      <Section title="Absolute Margins">
        {SHARED_EXAMPLES.map(({ description, property, title }) => (
          <Example
            description={description}
            key={title}
            title={title}
            config={{
              animationName: {
                to: {
                  [property]: spacing.md,
                },
              },
              ...SHARED_SETTINGS,
            }}
          />
        ))}
      </Section>
    </ScrollScreen>
  );
}

function RelativeMargins() {
  return (
    <ScrollScreen>
      <Section
        description="Relative margins are a bit weird. Yoga doesn't apply them properly, thus they don't work the same as in CSS."
        title="Relative Margins">
        {SHARED_EXAMPLES.map(({ description, property, title }) => (
          <Example
            description={description}
            key={title}
            title={title}
            config={{
              animationName: {
                from: {
                  [property]: '10%',
                },
                to: {
                  [property]: '40%',
                },
              },
              ...SHARED_SETTINGS,
            }}
          />
        ))}
      </Section>
    </ScrollScreen>
  );
}

// function MixedMargins() {
//   return (
//     <ScrollScreen>
//       <Section title="Mixed Margins">
//         <Example
//           config={{
//             animationName: {
//               from: {
//                 margin: spacing.md,
//               },
//               to: {
//                 margin: '40%',
//               },
//             },
//             ...SHARED_SETTINGS,
//           }}
//           title="Mixed Margins"
//         />

//         <Example
//           config={{
//             animationName: {
//               from: {
//                 marginRight: 0,
//               },
//               '25%': {
//                 marginRight: '50%',
//               },
//               '50%': {
//                 marginRight: spacing.md,
//               },
//               '75%': {
//                 marginRight: '25%',
//               },
//               to: {
//                 marginRight: 0,
//               },
//             },
//             ...SHARED_SETTINGS,
//           }}
//           title="Horizontal Margin"
//         />
//       </Section>
//     </ScrollScreen>
//   );
// }

type ExampleProps = {
  config: CSSAnimationConfig;
} & Omit<ExampleCardProps, 'code'>;

function Example({ config, ...cardProps }: ExampleProps) {
  return (
    <ExampleCard
      code={formatAnimationCode(config)}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      {...cardProps}>
      <View style={styles.box} />
      <View style={styles.boxesRow}>
        <View style={styles.box} />
        <View style={styles.boxWrapper}>
          <Animated.View style={[styles.box, styles.animatedBox, config]} />
        </View>
        <View style={styles.box} />
      </View>
      <View style={styles.box} />
    </ExampleCard>
  );
}

const styles = StyleSheet.create({
  animatedBox: {
    backgroundColor: colors.primaryDark,
  },
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.sm,
    width: sizes.sm,
  },
  boxWrapper: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  boxesRow: {
    backgroundColor: colors.background3,
    borderRadius: radius.sm,
    flexDirection: 'row',
  },
});
