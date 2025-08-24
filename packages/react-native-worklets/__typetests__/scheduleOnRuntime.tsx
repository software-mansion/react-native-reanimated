/* eslint-disable @typescript-eslint/no-unused-vars */
import { createWorkletRuntime, scheduleOnRuntime } from '..';

function scheduleOnRNTypeTests() {
  const workletRuntime = createWorkletRuntime({ name: 'test' });
  // Correct usage - correct usage
  scheduleOnRuntime(
    workletRuntime,
    (num: number) => {
      'worklet';
      console.log(num);
    },
    0
  );

  // Correct usage - correct usage
  scheduleOnRuntime(
    workletRuntime,
    (obj: Record<string, unknown>) => console.log(obj),
    {
      a: [],
    }
  );

  scheduleOnRuntime(
    workletRuntime,
    (num: number) => {
      console.log(num);
    },
    // @ts-expect-error - wrong args type
    'tets'
  );

  scheduleOnRuntime(
    workletRuntime,
    (obj: Record<string, unknown>) => console.log(obj),
    // @ts-expect-error - wrong args type
    []
  );

  // @ts-expect-error - expected no args, but arg is provided
  scheduleOnRuntime(workletRuntime, () => {}, 0);

  // @ts-expect-error - expected args, but arg is not provided
  scheduleOnRuntime(workletRuntime, (num: number) => {
    console.log(num);
  });
}
