import { makeMutable } from 'react-native-reanimated';

import type { TestComponent } from '../TestComponent';
import type { Operation, OperationUpdate } from '../types';
import { isValidPropName } from '../types';
import { runOnUIBlocking } from '../utils/runOnUIBlocking';
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

  function _isUnmountedViewError(error: unknown): boolean {
    'worklet';
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('no longer mounted') ||
      message.includes('Cannot cast shadow node to LayoutableShadowNode')
    );
  }

  function _updateNativeSnapshot(
    updateInfos: JsUpdate[],
    jsUpdateIndex: number
  ): JsUpdate[] {
    'worklet';
    const snapshotted: JsUpdate[] = [];
    const snapshots: NativeUpdate[] = [];
    for (const updateInfo of updateInfos) {
      const snapshot: OperationUpdate = {};
      const updatedProps = Object.keys(updateInfo.update);
      const propsToUpdate = updatedProps.filter((propName) =>
        isValidPropName(propName)
      );
      try {
        for (const prop of propsToUpdate) {
          snapshot[prop] = global._obtainProp(
            updateInfo?.shadowNodeWrapper,
            prop
          );
        }
      } catch (error) {
        if (_isUnmountedViewError(error)) {
          continue;
        }
        throw error;
      }
      snapshots.push({
        tag: updateInfo.tag,
        shadowNodeWrapper: updateInfo.shadowNodeWrapper,
        snapshot,
        jsUpdateIndex,
      });
      snapshotted.push(updateInfo);
    }
    if (snapshots.length > 0) {
      nativeSnapshots.modify((values) => {
        'worklet';
        for (const snapshot of snapshots) {
          values.push(snapshot);
        }
        return values;
      });
    }
    return snapshotted;
  }

  function _updateJsSnapshot(newUpdates: JsUpdate[]): void {
    'worklet';
    jsUpdates.modify((updates) => {
      for (const update of newUpdates) {
        updates.push(update);
      }
      return updates;
    });
  }

  function _extractJSUpdatesUpdatesFromOperation(
    operations: Operation[]
  ): Array<Required<JsUpdate>> {
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
    const snapshotted = _updateNativeSnapshot(
      newUpdates,
      jsUpdates.value.length - 1
    );
    _updateJsSnapshot(snapshotted);
  }

  function pushLayoutAnimationUpdates(
    tag: number,
    update: Record<string, unknown>
  ) {
    'worklet';
    // Deep Copy, works with nested objects, but doesn't copy functions (which should be fine here)
    const updatesCopy = JSON.parse(JSON.stringify(update));
    if ('backgroundColor' in updatesCopy) {
      updatesCopy.backgroundColor = convertDecimalColor(
        updatesCopy.backgroundColor
      );
    }
    const snapshotted = _updateNativeSnapshot(
      [{ tag, update }],
      jsUpdates.value.length - 1
    );
    if (snapshotted.length === 0) {
      return;
    }
    jsUpdates.modify((updates) => {
      updates.push({
        tag,
        update: updatesCopy,
      });
      return updates;
    });
  }

  function _sortUpdatesByViewTag(
    updates: Array<JsUpdate> | Array<NativeUpdate>,
    propsNames: string[]
  ): MultiViewSnapshot {
    const updatesForTag: Record<number, Array<OperationUpdate>> = {};
    for (const updateRequest of updates) {
      const { tag } = updateRequest;

      if (!(tag in updatesForTag)) {
        updatesForTag[tag] = [];
      }
      let update: OperationUpdate = {};
      if (propsNames.length === 0) {
        update =
          'update' in updateRequest
            ? updateRequest.update
            : updateRequest.snapshot;
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

  function _getComponentFromSortedUpdates(
    sortedUpdates: MultiViewSnapshot,
    component?: TestComponent
  ) {
    if (component === undefined) {
      const viewTags = Object.keys(sortedUpdates);
      if (viewTags.length === 1) {
        return sortedUpdates[Number(viewTags[0])];
      }
      throw new Error(
        'Recorded snapshots of many views, specify component you want to get snapshot of'
      );
    }
    const tag = component?.getTag();
    if (!tag || !(tag in sortedUpdates)) {
      throw new Error('Snapshot of given component not found');
    } else {
      return sortedUpdates[tag];
    }
  }

  function _readRecorded() {
    return runOnUIBlocking(
      () => {
        'worklet';
        return {
          jsUpdates: jsUpdates.value,
          nativeSnapshots: nativeSnapshots.value,
        };
      },
      undefined,
      'the UI runtime to report the recorded animation updates'
    );
  }

  async function getUpdates(
    component?: TestComponent,
    propsNames: string[] = []
  ): Promise<SingleViewSnapshot> {
    const recorded = await _readRecorded();
    const sortedUpdates = _sortUpdatesByViewTag(recorded.jsUpdates, propsNames);
    return _getComponentFromSortedUpdates(sortedUpdates, component);
  }

  async function getNativeSnapshots(
    component?: TestComponent,
    propsNames: string[] = []
  ): Promise<SingleViewSnapshot> {
    let recorded = await _readRecorded();
    const nativeSnapshotsCount = recorded.nativeSnapshots.length;
    const jsUpdatesCount = recorded.jsUpdates.length;
    if (jsUpdatesCount === nativeSnapshotsCount) {
      await runOnUIBlocking(() => {
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
            jsUpdatesCount - 1
          );
        }
      });
      recorded = await _readRecorded();
    }
    const sortedUpdates = _sortUpdatesByViewTag(
      recorded.nativeSnapshots,
      propsNames
    );
    return _getComponentFromSortedUpdates(sortedUpdates, component);
  }

  return {
    pushAnimationUpdates,
    pushLayoutAnimationUpdates,
    getUpdates,
    getNativeSnapshots,
  };
}
