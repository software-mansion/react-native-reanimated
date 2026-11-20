import {
  awaitPromise,
  createShareable,
  createWorkletRuntime,
  scheduleOnRuntime,
  setInterval,
} from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime();
  const initialValue = yield -1;
  const result = yield createShareable(worker.runtimeId, initialValue);

  function* taskDispatch() {
    function* task() {
      yield result.value++;
    }

    yield setInterval(task, 16);
  }

  yield scheduleOnRuntime(worker, taskDispatch);

  function* synchronize() {
    const syncResult = yield result.getSync();
    const asyncResult = yield result.getAsync();
    yield console.log('sync:', syncResult);
    const value = yield awaitPromise(asyncResult);
    yield console.log('async:', value);
  }

  yield setInterval(synchronize, 80); // Only once in a while
}
