import {
  clearInterval,
  createWorkletRuntime,
  scheduleOnRuntime,
  setInterval,
} from '@site/src/simulation/worklets';

export function* startTimer() {
  'worklet';
  let count = yield 0;

  function* poll() {
    count = yield count + 1;
    yield console.log('Worker tick:', count);
    if (count === 3) clearInterval(interval);
    yield;
  }

  const interval = yield setInterval(poll, 32);
}

export default function* main() {
  const worker = yield createWorkletRuntime({ name: 'background' });
  yield scheduleOnRuntime(worker, startTimer);
}
