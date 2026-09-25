import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRuntime,
  setInterval,
  setTimeout,
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

  // Only once in a while
  function* poll() {
    yield console.log(result.getDirty());
  }
  yield setTimeout(poll, 160);
}
