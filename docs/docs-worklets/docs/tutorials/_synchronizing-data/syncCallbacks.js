import {
  createWorkletRuntime,
  heapVariable,
  scheduleOnRN,
  scheduleOnRuntime,
  setInterval,
} from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime();

  const polledResult = yield heapVariable('polledResult', -1);
  function* pollResult(value) {
    polledResult.value = yield value;
  }

  function* taskDispatch() {
    const result = yield heapVariable('result', -1);

    function* task() {
      yield result.value++;
      yield scheduleOnRN(pollResult, result.value);
    }

    yield setInterval(task, 16);
  }

  yield scheduleOnRuntime(worker, taskDispatch);

  function* synchronize() {
    yield console.log(polledResult.value);
  }

  // Only once in a while
  yield setInterval(synchronize, 80);
}
