import Animated, { css } from 'react-native-reanimated';

import { Grid } from '../components/Grid';
import { range } from '../components/range';
import { useStep } from '../components/useStep';
import type { ScenarioProps } from './registry';

const TRANSITION_MS = 500;

export function Css({ load }: ScenarioProps) {
  const isMoved = useStep(TRANSITION_MS) % 2 === 1;

  return (
    <Grid>
      {range(0, load).map((index) =>
        index % 2 === 0 ? (
          <Animated.View key={index} style={[styles.box, styles.animation]} />
        ) : (
          <Animated.View
            key={index}
            style={[styles.box, styles.transition, isMoved && styles.moved]}
          />
        )
      )}
    </Grid>
  );
}

const pulse = css.keyframes({
  from: { opacity: 0.3, transform: [{ rotate: '0deg' }, { scale: 0.6 }] },
  to: { opacity: 1, transform: [{ rotate: '180deg' }, { scale: 1 }] },
});

const styles = css.create({
  box: {
    width: 14,
    height: 14,
    margin: 3,
    backgroundColor: 'seagreen',
  },
  animation: {
    animationName: pulse,
    animationDuration: '1s',
    animationDirection: 'alternate',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
  transition: {
    opacity: 0.3,
    transform: [{ translateX: 0 }, { rotate: '0deg' }],
    transitionProperty: ['opacity', 'transform'],
    transitionDuration: TRANSITION_MS,
    transitionTimingFunction: 'linear',
  },
  moved: {
    opacity: 1,
    transform: [{ translateX: 6 }, { rotate: '90deg' }],
  },
});
