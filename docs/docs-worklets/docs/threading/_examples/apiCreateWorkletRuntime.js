import {
  createWorkletRuntime,
  getCurrentThreadId,
  globalThis,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';

export function* initialize() {
  'worklet';
  yield (globalThis.message = 'Ready');
  yield console.log('Initializer thread:', getCurrentThreadId());
}

export function* runTask() {
  'worklet';
  yield console.log(globalThis.message); // Ready
  yield console.log('Worker thread:', getCurrentThreadId());
}

export default function* main() {
  const worker = yield createWorkletRuntime({
    name: 'background',
    initializer: initialize,
  });
  yield console.log('Creator thread:', getCurrentThreadId());
  yield scheduleOnRuntime(worker, runTask);
}
