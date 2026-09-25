import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRuntime,
  setInterval,
  setTimeout,
} from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime();
  const result = yield createSynchronizable(-1, { fixedType: true });

  function* taskDispatch() {
    let localResult = yield result.getDirty();

    function* task() {
      yield localResult++;
      yield result.setDirty(localResult);
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
