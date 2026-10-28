import {
  createWorkletRuntime,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';
import { resetHooks, useState } from '@site/src/simulation/react';
import { doImportantStuff } from '@site/src/simulation/mocks';

export function* Component() {
  const [state, setState] = yield useState(0);
  const worker = yield createWorkletRuntime({ name: 'worker' });

  function* task() {
    'worklet';
    const result = yield doImportantStuff();
    yield setState(result); // This call crashes on the Worker Runtime.
  }

  yield scheduleOnRuntime(worker, task);
  return yield null;
}

export default function* main() {
  'hidden';
  resetHooks();
  yield Component();
}
