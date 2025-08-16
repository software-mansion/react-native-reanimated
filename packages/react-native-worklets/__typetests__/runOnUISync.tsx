/* eslint-disable @typescript-eslint/no-unused-vars */
import { runOnUISync } from '..';

function runOnUISyncTypeTests() {
  // Correct usage - correct usage
  runOnUISync((num: number): number => {
    return num + 1;
  }, 0);

  // @ts-expect-error - expected no args, but arg is provided
  runOnUISync((): void => {}, 0);

  // Wrong args type
  runOnUISync((num: number): number => {
    return num + 1;
    // @ts-expect-error - wrong args type
  }, 'tets');

  // Wrong return type
  runOnUISync((num: number): string => {
    // @ts-expect-error - wrong return type
    return num + 1;
  }, 0);

  // @ts-expect-error - wrong return type
  const result: string = runOnUISync((num: number): number => {
    return num + 1;
  }, 0);
}
