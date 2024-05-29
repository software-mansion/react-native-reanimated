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
        // Deep Copy, works with nested objects, but doesn't copy functions (which should be fine here)
        update: JSON.parse(JSON.stringify(update)),
      });
      return updates;
    });
  }

  function sortUpdatesByTag(
    updates: Array<{ tag: number; update: OperationUpdate } | { tag: number; snapshot: Record<string, unknown> }>,
    propsNames: string[],
  ) {
    const updatesForTag: Record<number, Array<OperationUpdate>> = {};

    for (const updateRequest of updates) {
      const { tag } = updateRequest;

      let update: OperationUpdate = [];
      if (propsNames.length !== 0) {
        update = 'update' in updateRequest ? updateRequest.update : updateRequest.snapshot;
      } else {
        for (const prop of propsNames) {
          update[prop] =
            'update' in updateRequest
              ? updateRequest.update[prop as keyof OperationUpdate]
              : updateRequest.snapshot[prop as keyof OperationUpdate];
        }
      }

      if (!(tag in updatesForTag)) {
        updatesForTag[tag] = [];
      }
      updatesForTag[tag].push('update' in updateRequest ? updateRequest.update : updateRequest.snapshot);
    }

    const recordedMultipleViews = Object.keys(updatesForTag).length > 1;
    let index = -1;
    const updatesForTagUnified = recordedMultipleViews
      ? Object.fromEntries(
          Object.entries(updatesForTag).map(([_key, value]) => {
            index += 1;
            return [index, value];
          }),
        )
      : updatesForTag[0]; // In case of recording only one view return an array

    return updatesForTagUnified;
  }

  function getUpdates(propsNames: string[] = []) {
    return sortUpdatesByTag(jsUpdates.value, propsNames);
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
    return sortUpdatesByTag(nativeSnapshots.value, propsNames);
    // const snapshots: OperationUpdate[] = [];
    // if (propsNames.length === 0) {
    //   for (const nativeSnapshot of nativeSnapshots.value) {
    //     snapshots.push(nativeSnapshot.snapshot);
    //   }
    // } else {
    //   for (const nativeSnapshot of nativeSnapshots.value) {
    //     const filteredSnapshot: Record<string, unknown> = {};
    //     for (const prop of propsNames) {
    //       filteredSnapshot[prop] = nativeSnapshot.snapshot[prop];
    //     }
    //     snapshots.push(filteredSnapshot);
    //   }
    // }
    // return snapshots;
  }

  return {
    pushAnimationUpdates,
    pushLayoutAnimationUpdates,
    getUpdates,
    getNativeSnapshots,
  };
}
