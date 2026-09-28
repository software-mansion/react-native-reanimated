import {
  awaitPromise,
  createWorkletRuntime,
  getCurrentThreadId,
  runOnRuntimeAsync,
  runOnUIAsync,
} from '@site/src/simulation/worklets';
import { doImportantStuff } from '@site/src/simulation/mocks';

export function* complexTask() {
  yield console.log(`computing on thread ${getCurrentThreadId()}`);
  const value = yield doImportantStuff();
  yield console.log('done');
  return yield value;
}

export default function* main() {
  const worker = yield createWorkletRuntime();
  const uiResult = yield runOnUIAsync(complexTask);
  const result = yield runOnRuntimeAsync(worker, complexTask);
  yield console.log('dispatched, RN Runtime keeps going');
  const first = yield awaitPromise(uiResult);
  const second = yield awaitPromise(result);
  yield console.log(first, second);
}
