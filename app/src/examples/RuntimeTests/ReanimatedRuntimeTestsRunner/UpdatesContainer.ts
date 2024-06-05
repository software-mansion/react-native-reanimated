import { makeMutable } from 'react-native-reanimated';
import { Operation, OperationUpdate, isValidPropName } from './types';
import { TestRunner } from './TestRunner';
import { MultiViewSnapshot, SingleViewSnapshot, Snapshot } from './matchers/snapshotMatchers';

type JsUpdate = {
  tag: number;
  shadowNodeWrapper?: unknown;
  update: OperationUpdate;
};
type NativeUpdate = {
  tag: number;
  shadowNodeWrapper?: unknown;
  snapshot: Record<string, unknown>;
  jsUpdateIndex: number;
};

export function createUpdatesContainer(testRunner: TestRunner) {
  const jsUpdates = makeMutable<Array<JsUpdate>>([]);
  const nativeSnapshots = makeMutable<Array<NativeUpdate>>([]);

  function _updateNativeSnapshot(updateInfos: JsUpdate[], jsUpdateIndex: number): void {
    'worklet';
    const isFabric = global._IS_FABRIC;
    nativeSnapshots.modify(values => {
      'worklet';
      for (const updateInfo of updateInfos) {
        const snapshot: OperationUpdate = {};
        const updatedProps = Object.keys(updateInfo.update);
        const propsToUpdate = updatedProps.filter(propName => isValidPropName(propName));
        for (const prop of propsToUpdate) {
          snapshot[prop] = isFabric
            ? global._obtainPropFabric(updateInfo?.shadowNodeWrapper, prop)
            : global._obtainPropPaper(updateInfo?.tag, prop);
        }
        values.push({
          tag: updateInfo.tag,
          shadowNodeWrapper: updateInfo.shadowNodeWrapper,
          snapshot: snapshot,
          jsUpdateIndex,
        });
      }
      return values;
    });
  }

  function _updateJsSnapshot(newUpdates: JsUpdate[]): void {
    'worklet';
    jsUpdates.modify(updates => {
      for (const update of newUpdates) {
        updates.push(update);
      }
      return updates;
    });
  }

  function _extractJSUpdatesUpdatesFromOperation(operations: Operation[]): Array<Required<JsUpdate>> {
    'worklet';
    const jsUpdates: Array<Required<JsUpdate>> = [];
    for (const operation of operations) {
      const { updates } = operation;
      if ('backgroundColor' in updates) {
        console.log(updates.backgroundColor);
      }
      jsUpdates.push({
        tag: operation.tag ?? -1,
        shadowNodeWrapper: operation.shadowNodeWrapper,
        update: updates,
      });
    }
    return jsUpdates;
  }

  function pushAnimationUpdates(operations: Operation[]) {
    'worklet';
    const newUpdates = _extractJSUpdatesUpdatesFromOperation(operations);
    _updateNativeSnapshot(newUpdates, jsUpdates.value.length - 1);
    _updateJsSnapshot(newUpdates);
  }

  function pushLayoutAnimationUpdates(tag: number, update: Record<string, unknown>) {
    'worklet';
    if (global._IS_FABRIC) {
      // layout animation doesn't work on Fabric yet
      return;
    }
    _updateNativeSnapshot([{ tag, update }], jsUpdates.value.length - 1);
    jsUpdates.modify(updates => {
      updates.push({
        tag,
        // Deep Copy, works with nested objects, but doesn't copy functions (which should be fine here)
        update: JSON.parse(JSON.stringify(update)),
      });
      return updates;
    });
  }

  function _sortUpdatesByViewTag(updates: Array<JsUpdate> | Array<NativeUpdate>, propsNames: string[]): Snapshot {
    const updatesForTag: Record<number, Array<OperationUpdate>> = {};
    for (const updateRequest of updates) {
      const { tag } = updateRequest;

      if (!(tag in updatesForTag)) {
        updatesForTag[tag] = [];
      }
      let update: OperationUpdate = [];
      if (propsNames.length === 0) {
        update = 'update' in updateRequest ? updateRequest.update : updateRequest.snapshot;
      } else {
        for (const prop of propsNames) {
          update[prop] =
            'update' in updateRequest
              ? updateRequest.update[prop as keyof OperationUpdate]
              : updateRequest.snapshot[prop as keyof OperationUpdate];
        }
      }
      updatesForTag[tag].push(update);
    }

    const recordedMultipleViews = Object.keys(updatesForTag).length > 1;
    let index = -1;

    if (recordedMultipleViews) {
      const multiViewSnapshot: MultiViewSnapshot = Object.fromEntries(
        Object.entries(updatesForTag).map(([_key, value]) => {
          index += 1;
          return [index, value];
        }),
      );
      return multiViewSnapshot;
    } else {
      // In case of recording only one view return an array
      const singleViewSnapshot: SingleViewSnapshot = updatesForTag[Number(Object.keys(updatesForTag)[0])];
      return singleViewSnapshot;
    }
  }

  function getUpdates(propsNames: string[] = []): Snapshot {
    return _sortUpdatesByViewTag(jsUpdates.value, propsNames);
  }

  async function getNativeSnapshots(propsNames: string[] = []) {
    const nativeSnapshotsCount = nativeSnapshots.value.length;
    const jsUpdatesCount = jsUpdates.value.length;
    if (jsUpdatesCount === nativeSnapshotsCount) {
      await testRunner.runOnUIBlocking(() => {
        'worklet';
        const lastSnapshot = nativeSnapshots.value[nativeSnapshotsCount - 1];
        if (lastSnapshot) {
          _updateNativeSnapshot(
            [
              {
                tag: lastSnapshot.tag,
                shadowNodeWrapper: lastSnapshot.shadowNodeWrapper,
                update: lastSnapshot.snapshot,
              },
            ],
            jsUpdatesCount - 1,
          );
        }
      });
    }
    return _sortUpdatesByViewTag(nativeSnapshots.value, propsNames);
  }

  return {
    pushAnimationUpdates,
    pushLayoutAnimationUpdates,
    getUpdates,
    getNativeSnapshots,
  };
}
