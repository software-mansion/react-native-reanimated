import { abortWorkletRuntime, createWorkletRuntime } from '..';

function abortWorkletRuntimeTypeTests() {
  abortWorkletRuntime(1);
  abortWorkletRuntime(createWorkletRuntime({ abortable: true }).runtimeId);
  // @ts-expect-error The runtime id must be a number.
  abortWorkletRuntime('1');
  // @ts-expect-error The runtime id is required.
  abortWorkletRuntime();
}
