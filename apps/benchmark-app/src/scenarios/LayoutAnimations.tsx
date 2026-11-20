import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

import { range } from '../components/range';
import { useStep } from '../components/useStep';
import type { ScenarioProps } from './registry';

const STEP_MS = 500;
const ANIMATION_MS = 500;

const entering = FadeIn.duration(ANIMATION_MS).reduceMotion(ReduceMotion.Never);
const exiting = FadeOut.duration(ANIMATION_MS).reduceMotion(ReduceMotion.Never);
const layout = LinearTransition.duration(ANIMATION_MS).reduceMotion(
  ReduceMotion.Never
);

export function LayoutAnimations({ load }: ScenarioProps) {
  const step = useStep(STEP_MS);

  return (
    <View>
      {itemsAt(step, load).map((id) => (
        <Animated.View
          key={id}
          entering={entering}
          exiting={exiting}
          layout={layout}
          style={[styles.item, { width: 40 + (id % 6) * 40 }]}
        />
      ))}
    </View>
  );
}

function itemsAt(step: number, count: number) {
  const window = range(step, count);
  return step % 2 === 0 ? window : swapNeighbours(window);
}

function swapNeighbours(ids: number[]) {
  return ids.map((_, position) =>
    position % 2 === 0
      ? (ids[position + 1] ?? ids[position])
      : ids[position - 1]
  );
}

const styles = StyleSheet.create({
  item: {
    height: 18,
    marginVertical: 2,
    marginHorizontal: 8,
    backgroundColor: 'darkorange',
  },
});
