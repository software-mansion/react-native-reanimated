import { Grid } from '../components/Grid';
import { range } from '../components/range';
import { TransformBox } from '../components/TransformBox';
import type { ScenarioProps } from './registry';

export function WorkletStylesTransform({ load }: ScenarioProps) {
  return (
    <Grid>
      {range(0, load).map((index) => (
        <TransformBox key={index} index={index} />
      ))}
    </Grid>
  );
}
