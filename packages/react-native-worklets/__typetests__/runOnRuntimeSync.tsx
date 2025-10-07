/* eslint-disable @typescript-eslint/no-unused-vars */
import { createWorkletRuntime, runOnRuntimeSync, runOnUISync } from '..';

function runOnRuntimeSyncTypeTests() {
  const workletRuntime = createWorkletRuntime({ name: 'test' });
  // Correct usage - correct usage
  runOnRuntimeSync(
    workletRuntime,
    (num: number): number => {
      return num + 1;
    },
    0
  );

  // @ts-expect-error - expected no args, but arg is provided
  runOnRuntimeSync(workletRuntime, (): void => {}, 0);

  // Wrong args type
  runOnRuntimeSync(
    workletRuntime,
    (num: number): number => {
      return num + 1;
    },
    // @ts-expect-error - wrong args type
    'tets'
  );

  // Wrong return type
  runOnRuntimeSync(
    workletRuntime,
    (num: number): string => {
      // @ts-expect-error - wrong return type
      return num + 1;
    },
    0
  );

  // @ts-expect-error - wrong return type
  const result: string = runOnRuntimeSync(
    workletRuntime,
    (num: number): number => {
      return num + 1;
    },
    0
  );
}
