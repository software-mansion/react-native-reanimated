import {
  awaitPromise,
  createWorkletRuntime,
  globalThis,
  runOnRuntimeAsync,
  runOnRuntimeSync,
  scheduleOnRuntime,
  setInterval,
  setTimeout,
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

  // Only once in a while
  function* poll() {
    yield console.log('polling');
    return yield globalThis.result;
  }
  function* pollOnce() {
    const asyncResult = yield runOnRuntimeAsync(worker, poll);
    const syncResult = yield runOnRuntimeSync(worker, poll);
    yield console.log('sync:', syncResult);
    const value = yield awaitPromise(asyncResult);
    yield console.log('async:', value);
  }
  yield setTimeout(pollOnce, 160);
}
