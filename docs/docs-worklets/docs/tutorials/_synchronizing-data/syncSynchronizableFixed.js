import {
  createSynchronizable,
  createWorkletRuntime,
  scheduleOnRuntime,
  setInterval,
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

  function* synchronize() {
    yield console.log(result.getDirty());
  }

  // Only once in a while
  yield setInterval(synchronize, 80);
}
