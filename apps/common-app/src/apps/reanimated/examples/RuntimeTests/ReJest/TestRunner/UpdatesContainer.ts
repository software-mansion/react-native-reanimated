import { makeMutable } from 'react-native-reanimated';

import type { TestComponent } from '../TestComponent';
import type {
  Operation,
  OperationUpdate,
  RecordedNativeMutation,
} from '../types';
import { SyncUIRunner } from '../utils/SyncUIRunner';
import { convertDecimalColor } from '../utils/util';

export type SingleViewSnapshot = Array<OperationUpdate>;
type MultiViewSnapshot = Record<number, SingleViewSnapshot>;

// Safety net so a failing UI worklet can never hang the whole test run by
// preventing `runOnUIBlocking`'s unlock callback from firing.
const RUN_ON_UI_TIMEOUT_MS = 8000;

type JsUpdate = {
  tag: number;
  shadowNodeWrapper?: unknown;
  update: OperationUpdate;
};
type NativeUpdate = {
  tag: number;
  snapshot: Record<string, unknown>;
  jsUpdateIndex: number;
};

export function createUpdatesContainer() {
  const jsUpdates = makeMutable<Array<JsUpdate>>([]);

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
    const extractedUpdates: Array<Required<JsUpdate>> = [];
    for (const operation of operations) {
      const { updates } = operation;
      extractedUpdates.push({
        tag: operation.tag ?? -1,
        shadowNodeWrapper: operation.shadowNodeWrapper,
        update: updates,
      });
    }
    return extractedUpdates;
  }

  function pushAnimationUpdates(operations: Operation[]) {
    'worklet';
    // Only the JS-computed values are captured here. The native values are
    // recorded in C++ (`NativeMutationsRegistry`) from the mutations actually
    // sent to the platform and retrieved later via `getNativeSnapshots`. We must
    // NOT read native props per frame: on the new architecture that read
    // (`getNewestCloneOfShadowNode`) deadlocks against the in-flight commits.
    _updateJsSnapshot(_extractJSUpdatesUpdatesFromOperation(operations));
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

  function getUpdates(
    component?: TestComponent,
    propsNames: string[] = []
  ): SingleViewSnapshot {
    const sortedUpdates = _sortUpdatesByViewTag(jsUpdates.value, propsNames);
    return _getComponentFromSortedUpdates(sortedUpdates, component);
  }

  async function getNativeSnapshots(
    component?: TestComponent,
    propsNames: string[] = []
  ): Promise<SingleViewSnapshot> {
    // Reconstruct the native snapshots from the mutations recorded in C++ (the
    // values actually sent to the platform), in order. Each recorded mutation is
    // one native frame; the matcher's `+ Number(native)` offset accounts for the
    // one-frame lag between a JS update and its committed native value.
    const recorded = await getRecordedNativeMutations();
    const nativeUpdates: NativeUpdate[] = recorded
      .filter((mutation) => mutation.snapshot !== undefined)
      .map((mutation) => ({
        tag: mutation.tag,
        snapshot: mutation.snapshot as Record<string, unknown>,
        jsUpdateIndex: mutation.index,
      }));
    const sortedUpdates = _sortUpdatesByViewTag(nativeUpdates, propsNames);
    return _getComponentFromSortedUpdates(sortedUpdates, component);
  }

  async function getRecordedNativeMutations(): Promise<
    RecordedNativeMutation[]
  > {
    const recorded = makeMutable<RecordedNativeMutation[]>([]);
    await new SyncUIRunner().runOnUIBlocking(() => {
      'worklet';
      recorded.value = global._getRecordedNativeMutations?.() ?? [];
    }, RUN_ON_UI_TIMEOUT_MS);
    return recorded.value;
  }

  return {
    pushAnimationUpdates,
    pushLayoutAnimationUpdates,
    getUpdates,
    getNativeSnapshots,
    getRecordedNativeMutations,
  };
}
