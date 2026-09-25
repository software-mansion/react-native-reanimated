import {
  createWorkletRuntime,
  scheduleOnRN,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';
import { doImportantStuff } from '@site/src/simulation/mocks';

export function* setState(value) {
  yield console.log(`state = ${value}`);
}

export function* task() {
  const result = yield doImportantStuff();
  yield scheduleOnRN(setState, result);
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  yield scheduleOnRuntime(worker, task);
}
