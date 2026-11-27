import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Grid } from '../components/Grid';
import { range } from '../components/range';
import { useRepeatingProgress } from '../components/useRepeatingProgress';
import type { ScenarioProps } from './registry';

export function WorkletStylesLayout({ load }: ScenarioProps) {
  return (
    <Grid>
      {range(0, load).map((index) => (
        <LayoutBox key={index} index={index} />
      ))}
    </Grid>
  );
}

function LayoutBox({ index }: { index: number }) {
  const progress = useRepeatingProgress(index);

  const animatedStyle = useAnimatedStyle(() => ({
    width: 6 + 12 * progress.value,
    height: 18 - 12 * progress.value,
    marginLeft: 2 + 4 * progress.value,
  }));

  return <Animated.View style={[styles.box, animatedStyle]} />;
}

const styles = StyleSheet.create({
  box: {
    marginVertical: 3,
    backgroundColor: 'royalblue',
  },
});
