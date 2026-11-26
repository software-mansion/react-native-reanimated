import {
  createWorkletRuntime,
  heapVariable,
  scheduleOnRuntime,
  setInterval,
} from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime();

  function* taskDispatch() {
    const result = yield heapVariable('result', -1);

    function* task() {
      yield result.value++;
    }

    yield setInterval(task, 16);
  }

  yield scheduleOnRuntime(worker, taskDispatch);
  // How to access `result` here?
}
