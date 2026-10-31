import type { WorkletRuntime } from 'react-native-worklets';
import {
  createSerializable,
  createSerializableRemoteFunction,
  createWorkletRuntime,
  runOnRuntimeSync,
  runOnUISync,
  serializableMappingCache,
} from 'react-native-worklets';

import {
  describe,
  expect,
  reloadAndResume,
  test,
} from '../../../ReJest/RuntimeTestsApi';

const SUITE_NAME = 'reload';
const MARKER = 'created by the old React Native instance';
const MAX_WORKER_RUNTIMES = 10000;
const MAX_GARBAGE_COLLECTIONS = 100;

interface Payload {
  marker: string;
  workerRuntimeId: number;
}

interface OldInstanceValues {
  worklet: () => Payload;
  rnRemoteFunction: () => number;
  workerRemoteFunction: () => number;
}

interface MaybeRemoteFunction {
  __remoteFunction?: boolean;
}

let oldValues: OldInstanceValues | null = null;
let sameIdWorker: WorkletRuntime | null = null;

describe('Values from an old React Native instance after a reload', () => {
  test('survive the reload in a native holder', async () => {
    const stashed = globalThis.__takeSerializablesStashedForReload();
    if (stashed.length === 0) {
      stashValuesOfThisInstance();
      await reloadAndResume(SUITE_NAME);
    }
    expect(stashed.length).toBe(3);
    stashed.forEach((ref) => serializableMappingCache.set(ref));
    const [worklet, rnRemoteFunction, workerRemoteFunction] =
      stashed as unknown as [() => Payload, () => number, () => number];
    oldValues = { worklet, rnRemoteFunction, workerRemoteFunction };
  });

  test('run an old cached worklet on the new UI Runtime', () => {
    const { worklet } = getOldValues();
    const marker = runOnUISync(() => {
      'worklet';
      return worklet().marker;
    });
    expect(marker).toBe(MARKER);
  });

  test('run an old cached worklet on a new Worker Runtime with the same id', () => {
    const { worklet } = getOldValues();
    const workerRuntimeId = runOnUISync(() => {
      'worklet';
      return worklet().workerRuntimeId;
    });
    sameIdWorker = createWorkerRuntimeWithId(workerRuntimeId);
    expect(sameIdWorker.runtimeId).toBe(workerRuntimeId);
    const marker = runOnRuntimeSync(sameIdWorker, () => {
      'worklet';
      return worklet().marker;
    });
    expect(marker).toBe(MARKER);
  });

  test('unpack an old RN Runtime Remote Function as a guard on the new RN Runtime', () => {
    const { rnRemoteFunction } = getOldValues();
    const carrier = createWorkletRuntime({
      name: 'reload-carrier',
      enableEventLoop: false,
    });
    const unpacked = runOnRuntimeSync(carrier, () => {
      'worklet';
      return rnRemoteFunction;
    }) as MaybeRemoteFunction;
    expect(unpacked.__remoteFunction).toBe(true);
  });

  test('unpack an old Worker Runtime Remote Function as a guard on a new Worker Runtime with the same id', () => {
    const { workerRemoteFunction } = getOldValues();
    if (sameIdWorker === null) {
      throw new Error('The Worker Runtime with the old id was not created.');
    }
    const isGuard = runOnRuntimeSync(sameIdWorker, () => {
      'worklet';
      return (workerRemoteFunction as MaybeRemoteFunction).__remoteFunction;
    });
    expect(isGuard).toBe(true);
  });

  test('release the old values without a crash', async () => {
    oldValues = null;
    sameIdWorker = null;
    await collectGarbageUntilReleased();
    expect(globalThis.__countLiveSerializablesTakenAfterReload()).toBe(0);
    const result = runOnUISync(() => {
      'worklet';
      return 1;
    });
    expect(result).toBe(1);
  });
});

function stashValuesOfThisInstance() {
  const worker = createWorkletRuntime({
    name: 'reload-old-worker',
    enableEventLoop: false,
  });
  const payload: Payload = {
    marker: MARKER,
    workerRuntimeId: worker.runtimeId,
  };
  const worklet = () => {
    'worklet';
    return payload;
  };
  runOnUISync(worklet);
  runOnRuntimeSync(worker, worklet);
  const rnFunction = () => 1;
  const workerRemoteFunction = runOnRuntimeSync(worker, () => {
    'worklet';
    const hostedFunction = () => 1;
    if (globalThis._WORKLETS_BUNDLE_MODE_ENABLED) {
      return hostedFunction;
    }
    const createSerializableNonWorkletFunction = globalThis
      .__workletsModuleProxy.createSerializableNonWorkletFunction as (
      fun: () => number,
      name: string
    ) => () => number;
    return createSerializableNonWorkletFunction(
      hostedFunction,
      'hostedFunction'
    );
  });

  globalThis.__stashSerializableForReload(createSerializable(worklet));
  globalThis.__stashSerializableForReload(
    createSerializableRemoteFunction(rnFunction)
  );
  globalThis.__stashSerializableForReload(workerRemoteFunction);
}

function getOldValues() {
  if (oldValues === null) {
    throw new Error('The values from the old instance were not restored.');
  }
  return oldValues;
}

function createWorkerRuntimeWithId(runtimeId: number) {
  for (let i = 0; i < MAX_WORKER_RUNTIMES; i++) {
    const runtime = createWorkletRuntime({
      name: `reload-same-id-${i}`,
      enableEventLoop: false,
    });
    if (runtime.runtimeId >= runtimeId) {
      return runtime;
    }
  }
  throw new Error(`Could not reach Worker Runtime id ${runtimeId}.`);
}

async function collectGarbageUntilReleased() {
  for (let i = 0; i < MAX_GARBAGE_COLLECTIONS; i++) {
    globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    if (globalThis.__countLiveSerializablesTakenAfterReload() === 0) {
      return;
    }
  }
}
