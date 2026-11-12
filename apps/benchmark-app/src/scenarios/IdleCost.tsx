import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Grid } from '../components/Grid';
import { range } from '../components/range';
import type { ScenarioProps } from './registry';

export function IdleCost({ load }: ScenarioProps) {
  const frame = useFrameCounter();

  return (
    <Grid>
      {range(0, load).map((index) => (
        <View
          key={index}
          style={[styles.box, { width: 6 + ((frame + index) % 12) }]}
        />
      ))}
    </Grid>
  );
}

function useFrameCounter() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let request = requestAnimationFrame(function onFrame() {
      setFrame((value) => value + 1);
      request = requestAnimationFrame(onFrame);
    });
    return () => cancelAnimationFrame(request);
  }, []);

  return frame;
}

const styles = StyleSheet.create({
  box: {
    height: 14,
    margin: 3,
    backgroundColor: 'gray',
  },
});
