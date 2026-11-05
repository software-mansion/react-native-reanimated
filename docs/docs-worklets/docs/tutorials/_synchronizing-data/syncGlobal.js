import {
  awaitPromise,
  createWorkletRuntime,
  globalThis,
  runOnRuntimeAsync,
  runOnRuntimeSync,
  scheduleOnRuntime,
  setInterval,
} from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime();

  function* taskDispatch() {
    globalThis.result = yield -1;

    function* task() {
      yield globalThis.result++;
    }

    yield setInterval(task, 16);
  }

  yield scheduleOnRuntime(worker, taskDispatch);

  function* poll() {
    yield console.log('polling');
    return yield globalThis.result;
  }
  function* synchronize() {
    const asyncResult = yield runOnRuntimeAsync(worker, poll);
    const syncResult = yield runOnRuntimeSync(worker, poll);
    yield console.log('sync:', syncResult);
    const value = yield awaitPromise(asyncResult);
    yield console.log('async:', value);
  }

  yield setInterval(synchronize, 80); // Only once in a while
}
