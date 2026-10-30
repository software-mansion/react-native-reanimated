import {
  createWorkletRuntime,
  runOnRuntimeAsync,
} from '@site/src/simulation/worklets';
import { doImportantStuff } from '@site/src/simulation/mocks';

export function* setState(value) {
  yield console.log(`state = ${value}`);
}

export function* task() {
  const result = yield doImportantStuff();
  return yield result;
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  yield runOnRuntimeAsync(worker, task).then((result) => setState(result));
}
