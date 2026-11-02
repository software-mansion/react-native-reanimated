import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
  setInterval,
  setTimeout,
} from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime();

  let polledResult = yield -1;
  function* pollResult(value) {
    polledResult = yield value;
  }

  function* taskDispatch() {
    let result = yield -1;

    function* task() {
      yield result++;
      yield scheduleOnRN(pollResult, result);
    }

    yield setInterval(task, 16);
  }

  yield scheduleOnRuntime(worker, taskDispatch);

  // Only once in a while
  function* poll() {
    yield console.log(polledResult);
  }
  yield setTimeout(poll, 160);
}
