import {
  createWorkletRuntime,
  scheduleOnRuntime,
  setInterval,
} from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime();

  function* taskDispatch() {
    let result = yield -1;

    function* task() {
      yield result++;
    }

    yield setInterval(task, 16);
  }

  yield scheduleOnRuntime(worker, taskDispatch);
}
