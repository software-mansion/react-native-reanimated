import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRuntime,
  setInterval,
} from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime();
  const result = yield createSynchronizable(-1);

  function* taskDispatch() {
    function* task() {
      yield result.setBlocking((value) => value + 1);
    }

    yield setInterval(task, 16);
  }

  yield scheduleOnRuntime(worker, taskDispatch);

  function* synchronize() {
    yield console.log(result.getDirty());
  }

  // Only once in a while
  yield setInterval(synchronize, 80);
}
