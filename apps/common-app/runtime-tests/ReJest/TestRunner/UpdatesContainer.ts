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
  const jsUpdates = makeMutable<Array<JsUpdate>>([]);
  const nativeSnapshots = makeMutable<Array<NativeUpdate>>([]);
  const viewTags = makeMutable<Map<unknown, number>>(new Map());
  const stopped = makeMutable(false);
  const errorReported = makeMutable(false);
  const recordingError = makeMutable<{
    message: string;
    stack?: string;
  } | null>(null);
  const stopRequested = makeMutable(false);
  const pairedClockValid = makeMutable(true);
  const hasLayoutUpdates = makeMutable(false);
  const terminalSnapshots = makeMutable<NativeUpdate[]>([]);
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
        pairedClockValid: boolean;
        hasLayoutUpdates: boolean;
      }
    | undefined;

  function saveError(error: unknown) {
    'worklet';
    recordingError.value ??=
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };
  }

  async function assertNoError() {
    const message = await runOnUIBlocking(() => {
      'worklet';
      const error = recordingError.value;
      if (error) {
        errorReported.value = true;
      }
      return error;
    });
    if (message) {
      const error = new Error(message.message);
      error.stack = message.stack ?? error.stack;
      throw error;
    }
  }

  function registerViews(
    descriptors: Array<{ tag: number; shadowNodeWrapper: unknown }>
  ) {
    'worklet';
    if (stopped.value) {
      return;
    }
    viewTags.modify((tags) => {
      for (const { tag, shadowNodeWrapper } of descriptors) {
        if (!tags.has(shadowNodeWrapper)) {
          tags.set(shadowNodeWrapper, tag);
        }
      }
      return tags;
    });
  }

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
            throw new Error(`Mounted view ${updateInfo.tag} is not available`);
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
      let tag =
        operation.tag ?? viewTags.value.get(operation.shadowNodeWrapper);
      if (tag === undefined) {
        if (nativeSource === 'mountedView' || !operation.shadowNodeWrapper) {
          throw new Error('Recorded update has no registered view tag');
        }
        tag = -viewTags.value.size - 1;
        const resolvedTag = tag;
        viewTags.modify((tags) => {
          tags.set(operation.shadowNodeWrapper, resolvedTag);
          return tags;
        });
      }
      jsUpdates.push({
        tag,
        shadowNodeWrapper: operation.shadowNodeWrapper,
        update: updates,
      });
    }
    return jsUpdates;
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
        values.push(sample);
      }
      return values;
    });
    pendingFrame.value = new Map();
  }

  function captureTerminal() {
    'worklet';
    try {
      flushFrame();
      const latest = new Map<number, JsUpdate>();
      for (const entry of jsUpdates.value) {
        const previous = latest.get(entry.tag);
        latest.set(entry.tag, {
          ...entry,
          update: { ...previous?.update, ...entry.update },
        });
      }
      const terminal: NativeUpdate[] = [];
      _updateNativeSnapshot(
        [...latest.values()],
        jsUpdates.value.length - 1,
        terminal
      );
      terminalSnapshots.value = terminal;
    } catch (error) {
      saveError(error);
    }
  }

  function pushAnimationUpdates(operations: Operation[]) {
    'worklet';
    if (stopped.value) {
      return;
    }
    const timestamp = global._getAnimationTimestamp();
    if (stopRequested.value && frameTimestamp.value !== timestamp) {
      captureTerminal();
      stopped.value = true;
      return;
    }
    pairedClockValid.value &&= global.mockedAnimationTimestamp !== undefined;
    const newUpdates = _extractJSUpdatesUpdatesFromOperation(operations);
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
    const timestamp = global._getAnimationTimestamp();
    if (stopRequested.value && frameTimestamp.value !== timestamp) {
      captureTerminal();
      stopped.value = true;
      return;
    }
    if (frameTimestamp.value !== null && frameTimestamp.value !== timestamp) {
      flushFrame();
    }
    frameTimestamp.value = timestamp;
    hasLayoutUpdates.value = true;
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
    if (Object.keys(sortedUpdates).some((tag) => Number(tag) < 0)) {
      throw new Error(
        'Recorded updates include unattributed views; use getAllUpdates'
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
    await assertNoError();
    const recorded = await _readRecorded();
    const sortedUpdates = _sortUpdatesByViewTag(recorded.jsUpdates, propsNames);
    return _getComponentFromSortedUpdates(sortedUpdates, component);
  }

  async function getSnapshots(
    component?: TestComponent,
    propsNames: string[] = []
  ) {
    await assertNoError();
    if (!completed) {
      throw new Error('Stop recording before reading paired snapshots');
    }
    if (!completed.pairedClockValid) {
      throw new Error('Paired snapshots require mockAnimationTimer');
    }
    if (completed.hasLayoutUpdates) {
      throw new Error('Paired snapshots do not support layout animations');
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
    await assertNoError();
    const recorded = completed ?? (await readWithTerminal());
    return _getComponentFromSortedUpdates(
      _sortUpdatesByViewTag(recorded.nativeSnapshots, propsNames),
      component
    );
  }

  async function getAllUpdates(propsNames: string[] = []) {
    await assertNoError();
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
      stopRequested.value = true;
    });
    await waitForFrames(1);
    completed = await runOnUIBlocking(() => {
      'worklet';
      if (!stopped.value) {
        captureTerminal();
      }
      stopped.value = true;
      viewTags.value = new Map();
      return {
        jsUpdates: [...jsUpdates.value],
        nativeSnapshots: [...nativeSnapshots.value, ...terminalSnapshots.value],
        frames: [...frameUpdates.value],
        frameSnapshots: [...frameSnapshots.value],
        pairedClockValid: pairedClockValid.value,
        hasLayoutUpdates: hasLayoutUpdates.value,
      };
    });
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

  function getUnreportedError() {
    return runOnUIBlocking(() => {
      'worklet';
      if (errorReported.value) {
        return null;
      }
      errorReported.value = true;
      return recordingError.value;
    });
  }

  return {
    registerViews,
    getUnreportedError,
    saveError,
    finalize,
    getSnapshots,
    getAllUpdates,
    pushAnimationUpdates,
    pushLayoutAnimationUpdates,
    getUpdates,
    getNativeSnapshots,
  };
}
