import { makeMutable } from 'react-native-reanimated';
import type { Operation, OperationUpdate } from '../types';
import { isValidPropName } from '../types';
import type { TestComponent } from '../TestComponent';
import { SyncUIRunner } from '../utils/SyncUIRunner';
import { convertDecimalColor } from '../utils/util';

export type SingleViewSnapshot = Array<OperationUpdate>;
type MultiViewSnapshot = Record<number, SingleViewSnapshot>;

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

export function createUpdatesContainer() {
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
            : global._obtainPropPaper(updateInfo.tag, prop);
        }
        values.push({
          tag: updateInfo.tag,
          shadowNodeWrapper: updateInfo.shadowNodeWrapper,
          snapshot,
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
    // Deep Copy, works with nested objects, but doesn't copy functions (which should be fine here)
    const updatesCopy = JSON.parse(JSON.stringify(update));
    if ('backgroundColor' in updatesCopy) {
      updatesCopy.backgroundColor = convertDecimalColor(updatesCopy.backgroundColor);
    }
    if (!global._IS_FABRIC) {
      _updateNativeSnapshot([{ tag, update }], jsUpdates.value.length - 1);
    }
    jsUpdates.modify(updates => {
      updates.push({
        tag,
        update: updatesCopy,
      });
      return updates;
    });
  }

  function _sortUpdatesByViewTag(
    updates: Array<JsUpdate> | Array<NativeUpdate>,
    propsNames: string[],
  ): MultiViewSnapshot {
    const updatesForTag: Record<number, Array<OperationUpdate>> = {};
    for (const updateRequest of updates) {
      const { tag } = updateRequest;

      if (!(tag in updatesForTag)) {
        updatesForTag[tag] = [];
      }
      let update: OperationUpdate = {};
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
    return updatesForTag;
  }

  function _getComponentFromSortedUpdates(sortedUpdates: MultiViewSnapshot, component?: TestComponent) {
    if (component === undefined) {
      const viewTags = Object.keys(sortedUpdates);
      if (viewTags.length === 1) {
        return sortedUpdates[Number(viewTags[0])];
      }
      throw new Error('Recorded snapshots of many views, specify component you want to get snapshot of');
    }
    const tag = component?.getTag();
    if (!tag || !(tag in sortedUpdates)) {
      if (_IS_FABRIC && (-1) in sortedUpdates) {
        return sortedUpdates[-1];
      }
      throw new Error('Snapshot of given component not found');
    } else {
      return sortedUpdates[tag];
    }
  }

  function getUpdates(component?: TestComponent, propsNames: string[] = []): SingleViewSnapshot {
    const sortedUpdates = _sortUpdatesByViewTag(jsUpdates.value, propsNames);
    return _getComponentFromSortedUpdates(sortedUpdates, component);
  }

  async function getNativeSnapshots(component?: TestComponent, propsNames: string[] = []): Promise<SingleViewSnapshot> {
    const nativeSnapshotsCount = nativeSnapshots.value.length;
    const jsUpdatesCount = jsUpdates.value.length;
    if (jsUpdatesCount === nativeSnapshotsCount) {
      await new SyncUIRunner().runOnUIBlocking(() => {
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
    const sortedUpdates = _sortUpdatesByViewTag(nativeSnapshots.value, propsNames);
    return _getComponentFromSortedUpdates(sortedUpdates, component);
  }

  return {
    pushAnimationUpdates,
    pushLayoutAnimationUpdates,
    getUpdates,
    getNativeSnapshots,
  };
}
