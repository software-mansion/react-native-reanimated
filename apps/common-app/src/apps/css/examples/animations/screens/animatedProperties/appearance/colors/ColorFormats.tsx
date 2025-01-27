import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ExamplesScreen, VerticalExampleCard } from '@/apps/css/components';
import { radius, sizes } from '@/theme';

export default function ColorsFormats() {
  return (
    <ExamplesScreen<{ from: string; to: string }>
      CardComponent={VerticalExampleCard}
      buildAnimation={({ from, to }) => ({
        animationDirection: 'alternate',
        animationDuration: '3s',
        animationIterationCount: 'infinite',
        animationName: {
          from: {
            backgroundColor: from,
          },
          to: {
            backgroundColor: to,
          },
        },
        animationTimingFunction: 'ease-in-out',
      })}
      renderExample={({ animation }) => (
        <Animated.View style={[styles.box, animation]} />
      )}
      tabs={[
        {
          buildAnimation: ({ from, to }) => ({
            animationDirection: 'alternate',
            animationDuration: '3s',
            animationIterationCount: 'infinite',
            animationName: {
              from: { backgroundColor: from },
              to: { backgroundColor: to },
            },
            animationTimingFunction: 'ease-in-out',
          }),
          name: 'Predefined',
          sections: [
            {
              examples: [
                {
                  from: 'red',
                  title: 'Predefined Colors',
                  to: 'cyan',
                },
              ],
              title: 'Predefined Colors',
            },
          ],
        },
        {
          name: 'RGB / RGBA',
          sections: [
            {
              examples: [
                {
                  from: 'rgb(131, 191, 96)',
                  title: 'RGB',
                  to: 'rgb(125, 44, 191)',
                },
                {
                  from: 'rgba(26, 15, 219, 0.2)',
                  title: 'RGBA',
                  to: 'rgba(26, 15, 219, 1.0)',
                },
              ],
              title: 'RGB and RGBA',
            },
          ],
        },
        {
          name: 'Hex',
          sections: [
            {
              examples: [
                {
                  from: '#f8a',
                  title: '#RGB',
                  to: '#9fb',
                },
                {
                  from: '#f8a1',
                  title: '#RGBA',
                  to: '#f8af',
                },
                {
                  from: '#ff8812',
                  title: '#RRGGBB',
                  to: '#90f10c',
                },
                {
                  from: '#ff881211',
                  title: '#RRGGBBAA',
                  to: '#ff8812ff',
                },
              ],
              title: 'RGB and RGBA hex',
            },
          ],
        },
        {
          name: 'HSL / HSLA',
          sections: [
            {
              examples: [
                {
                  from: 'hsl(9, 28%, 46%)',
                  title: 'HSL',
                  to: 'hsl(131, 33%, 48%)',
                },
                {
                  from: 'hsla(131, 33%, 48%, 0.1)',
                  title: 'HSLA',
                  to: 'hsla(131, 33%, 48%, 1)',
                },
              ],
              title: 'HSL and HSLA',
            },
          ],
        },
        {
          name: 'HWB',
          sections: [
            {
              examples: [
                {
                  from: 'hwb(311, 15%, 15%)',
                  title: 'HWB',
                  to: 'hwb(221, 25%, 42%)',
                },
              ],
              title: 'HWB',
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm,
    height: sizes.xl,
    width: sizes.xl,
  },
});
