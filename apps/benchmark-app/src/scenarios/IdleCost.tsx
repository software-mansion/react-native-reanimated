import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Grid } from '../components/Grid';
import { range } from '../components/range';
import type { ScenarioProps } from './registry';

const FRAMES_PER_UPDATE = 2;

export function IdleCost({ load }: ScenarioProps) {
  const update = useUpdateCounter();

  return (
    <Grid>
      {range(0, load).map((index) => (
        <View
          key={index}
          style={[styles.box, { width: 6 + ((update + index) % 12) }]}
        />
      ))}
    </Grid>
  );
}

function useUpdateCounter() {
  const [update, setUpdate] = useState(0);

  useEffect(() => {
    let frame = 0;
    let request = requestAnimationFrame(function onFrame() {
      frame += 1;
      if (frame % FRAMES_PER_UPDATE === 0) {
        setUpdate((value) => value + 1);
      }
      request = requestAnimationFrame(onFrame);
    });
    return () => cancelAnimationFrame(request);
  }, []);

  return update;
}

const styles = StyleSheet.create({
  box: {
    height: 14,
    margin: 3,
    backgroundColor: 'gray',
  },
});
