/* eslint-disable @typescript-eslint/no-unused-vars */
import { scheduleOnRN } from '..';

function scheduleOnRNTypeTests() {
  // Correct usage - correct usage
  scheduleOnRN((num: number) => {
    console.log(num);
  }, 0);

  // Correct usage - correct usage
  scheduleOnRN((obj: Record<string, unknown>) => console.log(obj), { a: [] });

  scheduleOnRN((num: number) => {
    console.log(num);
    // @ts-expect-error - wrong args type
  }, 'tets');

  // @ts-expect-error - wrong args type
  scheduleOnRN((obj: Record<string, unknown>) => console.log(obj), []);

  // @ts-expect-error - expected no args, but arg is provided
  scheduleOnRN(() => {}, 0);

  // @ts-expect-error - expected args, but arg is not provided
  scheduleOnRN((num: number) => {
    console.log(num);
  });
}
