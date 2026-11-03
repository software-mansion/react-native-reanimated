import {
  clearInterval,
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
  setInterval,
} from '@site/src/simulation/worklets';

export function* startTimer() {
  let count = yield 0;

  function* tick() {
    count = yield count + 1;
    yield console.log('tick:', count);
    if (count === 4) {
      clearInterval(interval);
    }
    yield;
  }

  const interval = yield setInterval(tick, 4);
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  yield scheduleOnRuntime(worker, startTimer);
  yield scheduleOnUI(startTimer);
  yield startTimer();
}
