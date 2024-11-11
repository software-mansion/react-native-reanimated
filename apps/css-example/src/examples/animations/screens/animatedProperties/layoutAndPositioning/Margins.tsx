import { StyleSheet, View } from 'react-native';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { ExamplesScreen } from '@/components';
import { colors, radius, sizes, spacing } from '@/theme';

const SHARED_SETTINGS: CSSAnimationSettings = {
  animationDirection: 'alternate',
  animationDuration: '1s',
  animationIterationCount: 'infinite',
};

const EXAMPLES = [
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

function renderExample({ config }: { config: CSSAnimationConfig }) {
  return (
    <>
      <View style={styles.box} />
      <View style={styles.boxesRow}>
        <View style={styles.box} />
        <View style={styles.boxWrapper}>
          <Animated.View style={[styles.box, styles.animatedBox, config]} />
        </View>
        <View style={styles.box} />
      </View>
      <View style={styles.box} />
    </>
  );
}

export default function Margins() {
  return (
    <ExamplesScreen<{ property: string }>
      tabs={[
        {
          buildConfig: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              to: {
                [property]: spacing.md,
              },
            },
          }),
          name: 'Absolute',
          renderExample,
          sections: [
            {
              examples: EXAMPLES,
              title: 'Absolute Margins',
            },
          ],
        },
        {
          buildConfig: ({ property }) => ({
            ...SHARED_SETTINGS,
            animationName: {
              from: {
                [property]: '10%',
              },
              to: {
                [property]: '40%',
              },
            },
          }),
          name: 'Relative',
          renderExample,
          sections: [
            {
              description:
                "Relative margins are a bit weird. Yoga doesn't apply them properly, thus they don't work the same as in CSS.",
              examples: EXAMPLES,
              title: 'Relative Margins',
            },
          ],
        },
      ]}
    />
  );
}

// TODO - Implement MixedMargins example once relative margins are supported
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
