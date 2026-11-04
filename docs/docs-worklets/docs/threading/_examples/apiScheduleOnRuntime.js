import {
  createWorkletRuntime,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';

export function* greet(greeting) {
  'worklet';
  yield console.log(`${greeting} from the background Worklet Runtime`);
}

export default function* main() {
  const workletRuntime = yield createWorkletRuntime({ name: 'background' });
  yield scheduleOnRuntime(workletRuntime, greet, 'Hello');
  yield console.log('The RN Runtime continues');
}
