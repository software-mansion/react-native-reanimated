/* eslint-disable @typescript-eslint/no-unused-vars */
import { scheduleOnRN } from '../src';

function scheduleOnRNTypeTests() {
  scheduleOnRN((num: number) => {
    console.log(num);
  }, 0);

  scheduleOnRN((obj: Record<string, unknown>) => console.log(obj), { a: [] });

  scheduleOnRN((num: number) => {
    console.log(num);
    // @ts-expect-error - wrong args type
  }, 'tets');

  // @ts-expect-error - wrong args type
  scheduleOnRN((obj: Record<string, unknown>) => console.log(obj), []);
}
