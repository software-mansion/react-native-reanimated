import { View } from 'react-native';

import { Grid } from '../components/Grid';
import { range } from '../components/range';
import { TransformBox } from '../components/TransformBox';
import { useStep } from '../components/useStep';
import type { ScenarioProps } from './registry';

const HALF_CYCLE_MS = 500;

export function MountUnmount({ load }: ScenarioProps) {
  const isMounted = useStep(HALF_CYCLE_MS) % 2 === 0;

  return (
    <View>
      <FrameSource />
      {isMounted && (
        <Grid>
          {range(0, load).map((index) => (
            <TransformBox key={index} index={index} />
          ))}
        </Grid>
      )}
    </View>
  );
}

function FrameSource() {
  return <TransformBox index={0} />;
}
