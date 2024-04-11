import { makeMutable } from 'react-native-reanimated';
import { Operation, OperationUpdate } from './types';
import { TestRunner } from './TestRunner';

type UpdateInfo = {
  tag: number;
  shadowNodeWrapper?: unknown;
  update: OperationUpdate;
};

export function createUpdatesContainer(testRunner: TestRunner) {
  const jsUpdates = makeMutable<
    Array<{
      tag: number;
      shadowNodeWrapper?: unknown;
      update: OperationUpdate;
    }>
  >([]);
  const nativeSnapshots = makeMutable<
    Array<{
      tag: number;
      shadowNodeWrapper?: unknown;
      snapshot: Record<string, unknown>;
      jsUpdateIndex: number;
    }>
  >([]);

  function _makeNativeSnapshot(updateInfos: UpdateInfo[], jsUpdateIndex: number) {
    'worklet';
    const isFabric = global._IS_FABRIC;
    nativeSnapshots.modify(value => {
      'worklet';
      for (const updateInfo of updateInfos) {
        const snapshot: Record<string, unknown> = {};
        const propsToUpdate = Object.keys(updateInfo.update);
        for (const prop of propsToUpdate) {
          snapshot[prop] = isFabric
            ? global._obtainPropFabric(updateInfo?.shadowNodeWrapper, prop)
            : global._obtainPropPaper(updateInfo?.tag, prop);
        }
        value.push({
          tag: updateInfo.tag,
          shadowNodeWrapper: updateInfo.shadowNodeWrapper,
          snapshot: snapshot,
          jsUpdateIndex,
        });
      }
      return value;
    });
  }

  function _extractInfoFromUpdates(operations: Operation[]) {
    'worklet';
    const info: {
      tag: number;
      shadowNodeWrapper: unknown;
      update: OperationUpdate;
    }[] = [];
    for (const operation of operations) {
      info.push({
        tag: operation.tag ?? -1,
        shadowNodeWrapper: operation.shadowNodeWrapper,
        update: operation.updates,
      });
    }
    return info;
  }

  function pushAnimationUpdates(operations: Operation[]) {
    'worklet';
    _makeNativeSnapshot(_extractInfoFromUpdates(operations), jsUpdates.value.length - 1);
    jsUpdates.modify(updates => {
      for (const operation of operations) {
        updates.push({
          tag: operation.tag ?? -1,
          shadowNodeWrapper: operation.shadowNodeWrapper,
          update: operation.updates,
        });
      }
      return updates;
    });
  }

  function pushLayoutAnimationUpdates(tag: number, update: Record<string, unknown>) {
    'worklet';
    if (global._IS_FABRIC) {
      // layout animation doesn't work on Fabric yet
      return;
    }
    _makeNativeSnapshot([{ tag, update }], jsUpdates.value.length - 1);
    jsUpdates.modify(updates => {
      updates.push({
        tag,
        update: { ...update },
      });
      return updates;
    });
  }

  function getUpdates(propsNames: string[] = []) {
    const updates: OperationUpdate[] = [];
    if (propsNames.length === 0) {
      for (const updateRequest of jsUpdates.value) {
        updates.push(updateRequest.update);
      }
    } else {
      for (const updateRequest of jsUpdates.value) {
        const filteredUpdate: Record<string, OperationUpdate> = {};
        for (const prop of propsNames) {
          filteredUpdate[prop] = updateRequest.update[prop as keyof OperationUpdate];
        }
        updates.push(filteredUpdate);
      }
    }
    return updates;
  }

  async function getNativeSnapshots(propsNames: string[] = []) {
    const nativeSnapshotsCount = nativeSnapshots.value.length;
    const jsUpdatesCount = jsUpdates.value.length;
    if (jsUpdatesCount === nativeSnapshotsCount) {
      await testRunner.runOnUIBlocking(() => {
        'worklet';
        const lastSnapshot = nativeSnapshots.value[nativeSnapshotsCount - 1];
        _makeNativeSnapshot(
          [
            {
              tag: lastSnapshot.tag,
              shadowNodeWrapper: lastSnapshot.shadowNodeWrapper,
              update: lastSnapshot.snapshot,
            },
          ],
          jsUpdatesCount - 1,
        );
      });
    }

    const snapshots: OperationUpdate[] = [];
    if (propsNames.length === 0) {
      for (const nativeSnapshot of nativeSnapshots.value) {
        snapshots.push(nativeSnapshot.snapshot);
      }
    } else {
      for (const nativeSnapshot of nativeSnapshots.value) {
        const filteredSnapshot: Record<string, unknown> = {};
        for (const prop of propsNames) {
          filteredSnapshot[prop] = nativeSnapshot.snapshot[prop];
        }
        snapshots.push(filteredSnapshot);
      }
    }
    return snapshots;
  }

  return {
    pushAnimationUpdates,
    pushLayoutAnimationUpdates,
    getUpdates,
    getNativeSnapshots,
  };
}
