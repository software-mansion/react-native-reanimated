import { makeMutable } from 'react-native-reanimated';

import type { TestComponent } from '../TestComponent';
import type { Operation, OperationUpdate, RecordingOptions } from '../types';
import { isValidPropName } from '../types';
import { runOnUIBlocking } from '../utils/runOnUIBlocking';
import { convertDecimalColor } from '../utils/util';
import { waitForFrames } from '../utils/waitForFrames';

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

export function createUpdatesContainer({
  nativeSource = 'shadowTree',
}: RecordingOptions = {}) {
  const viewTags = makeMutable<Map<unknown, number>>(new Map());
  const stopped = makeMutable(false);
  const pendingFrame = makeMutable<Map<number, JsUpdate>>(new Map());
  const frameTimestamp = makeMutable<number | null>(null);
  const frameUpdates = makeMutable<JsUpdate[]>([]);
  const frameSnapshots = makeMutable<NativeUpdate[]>([]);
  let completed:
    | {
        jsUpdates: JsUpdate[];
        nativeSnapshots: NativeUpdate[];
        frames: JsUpdate[];
        frameSnapshots: NativeUpdate[];
      }
    | undefined;

  function registerViews(
    descriptors: Array<{ tag: number; shadowNodeWrapper: unknown }>
  ) {
    'worklet';
    viewTags.modify((tags) => {
      for (const { tag, shadowNodeWrapper } of descriptors) {
        tags.set(shadowNodeWrapper, tag);
      }
      return tags;
    });
  }
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
    jsUpdateIndex: number,
    terminalSnapshots?: NativeUpdate[]
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
        if (nativeSource === 'mountedView') {
          const unsupported = updatedProps.filter(
            (prop) => prop !== 'opacity' && prop !== 'backgroundColor'
          );
          if (unsupported.length) {
            throw new Error(
              `Mounted snapshots do not support: ${unsupported.join(', ')}`
            );
          }
          const mounted = global._obtainMountedViewProps(updateInfo.tag, false);
          if (!mounted) {
            continue;
          }
          for (const prop of propsToUpdate) {
            snapshot[prop] = mounted[prop as 'opacity' | 'backgroundColor'];
          }
        } else {
          for (const prop of propsToUpdate) {
            snapshot[prop] = global._obtainProp(
              updateInfo.shadowNodeWrapper,
              prop
            );
          }
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
    if (terminalSnapshots) {
      terminalSnapshots.push(...snapshots);
    } else if (snapshots.length > 0) {
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
      const tag =
        operation.tag ?? viewTags.value.get(operation.shadowNodeWrapper);
      if (tag === undefined) {
        throw new Error('Recorded update has no registered view tag');
      }
      jsUpdates.push({
        tag,
        shadowNodeWrapper: operation.shadowNodeWrapper,
        update: updates,
      });
    }
    return jsUpdates;
  }

  function pushAnimationUpdates(operations: Operation[]) {
    'worklet';
    if (stopped.value) {
      return;
    }
    const newUpdates = _extractJSUpdatesUpdatesFromOperation(operations);
    const timestamp = global._getAnimationTimestamp();
    if (frameTimestamp.value !== null && frameTimestamp.value !== timestamp) {
      flushFrame();
    }
    frameTimestamp.value = timestamp;
    pendingFrame.modify((pending) => {
      for (const entry of newUpdates) {
        const previous = pending.get(entry.tag);
        pending.set(entry.tag, {
          ...entry,
          update: { ...previous?.update, ...entry.update },
        });
      }
      return pending;
    });
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
    if (stopped.value) {
      return;
    }
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
      if (viewTags.length === 0) {
        throw new Error('No updates were recorded');
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
    if (completed) {
      return Promise.resolve(completed);
    }
    return runOnUIBlocking(
      () => {
        'worklet';
        // Copies, because serialization caches arrays by identity and the
        // recorder mutates them in place, so a second read would be stale.
        return {
          jsUpdates: [...jsUpdates.value],
          nativeSnapshots: [...nativeSnapshots.value],
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

  function getSnapshots(component?: TestComponent, propsNames: string[] = []) {
    if (!completed) {
      throw new Error('Stop recording before reading paired snapshots');
    }
    return {
      updates: _getComponentFromSortedUpdates(
        _sortUpdatesByViewTag(completed.frames, propsNames),
        component
      ),
      nativeSnapshots: _getComponentFromSortedUpdates(
        _sortUpdatesByViewTag(completed.frameSnapshots, propsNames),
        component
      ),
    };
  }

  async function getNativeSnapshots(
    component?: TestComponent,
    propsNames: string[] = []
  ) {
    const recorded = completed ?? (await readWithTerminal());
    return _getComponentFromSortedUpdates(
      _sortUpdatesByViewTag(recorded.nativeSnapshots, propsNames),
      component
    );
  }

  async function getAllUpdates(propsNames: string[] = []) {
    const recorded = await _readRecorded();
    return recorded.jsUpdates.map(({ update }) =>
      propsNames.length === 0
        ? update
        : Object.fromEntries(
            propsNames.map((prop) => [
              prop,
              update[prop as keyof OperationUpdate],
            ])
          )
    );
  }

  async function finalize() {
    if (completed) {
      return;
    }
    await runOnUIBlocking(() => {
      'worklet';
      stopped.value = true;
      viewTags.value = new Map();
    });
    await waitForFrames(1);
    completed = await runOnUIBlocking(() => {
      'worklet';
      flushFrame();
      const latest = new Map<number, JsUpdate>();
      for (const entry of jsUpdates.value) {
        latest.set(entry.tag, entry);
      }
      const terminal: NativeUpdate[] = [];
      _updateNativeSnapshot(
        [...latest.values()],
        jsUpdates.value.length - 1,
        terminal
      );
      return {
        jsUpdates: [...jsUpdates.value],
        nativeSnapshots: [...nativeSnapshots.value, ...terminal],
        frames: [...frameUpdates.value],
        frameSnapshots: [...frameSnapshots.value],
      };
    });
  }

  function flushFrame() {
    'worklet';
    const entries = [...pendingFrame.value.values()];
    const sampled: NativeUpdate[] = [];
    const captured = _updateNativeSnapshot(
      entries,
      frameUpdates.value.length,
      sampled
    );
    frameUpdates.modify((values) => {
      values.push(...captured);
      return values;
    });
    frameSnapshots.modify((values) => {
      for (const sample of sampled) {
        if (!values.some((previous) => previous.tag === sample.tag)) {
          values.push({ ...sample, snapshot: {} });
        }
        values.push(sample);
      }
      return values;
    });
    pendingFrame.value = new Map();
  }

  function readWithTerminal() {
    return runOnUIBlocking(() => {
      'worklet';
      const latest = new Map<number, JsUpdate>();
      for (const entry of jsUpdates.value) {
        const previous = latest.get(entry.tag);
        latest.set(entry.tag, {
          ...entry,
          update: { ...previous?.update, ...entry.update },
        });
      }
      const terminal: NativeUpdate[] = [];
      for (const entry of latest.values()) {
        _updateNativeSnapshot([entry], jsUpdates.value.length - 1, terminal);
      }
      return {
        jsUpdates: [...jsUpdates.value],
        nativeSnapshots: [...nativeSnapshots.value, ...terminal],
      };
    });
  }

  return {
    registerViews,
    finalize,
    getSnapshots,
    getAllUpdates,
    pushAnimationUpdates,
    pushLayoutAnimationUpdates,
    getUpdates,
    getNativeSnapshots,
  };
}
