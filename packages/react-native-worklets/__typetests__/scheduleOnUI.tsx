/* eslint-disable @typescript-eslint/no-unused-vars */
import { scheduleOnUI } from '..';

function scheduleOnUITypeTests() {
  // Correct usage - correct usage
  scheduleOnUI((num: number) => {
    console.log(num);
  }, 0);

  // Correct usage - correct usage
  scheduleOnUI((obj: Record<string, unknown>) => console.log(obj), { a: [] });

  scheduleOnUI((num: number) => {
    console.log(num);
    // @ts-expect-error - wrong args type
  }, 'tets');

  // @ts-expect-error - wrong args type
  scheduleOnUI((obj: Record<string, unknown>) => console.log(obj), []);

  // @ts-expect-error - expected no args, but arg is provided
  scheduleOnUI(() => {}, 0);

  // @ts-expect-error - expected args, but arg is not provided
  scheduleOnUI((num: number) => {
    console.log(num);
  });
}
