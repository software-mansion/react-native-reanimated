import { formatSnapshotMismatch, green, red, yellow } from '../stringFormatUtils';
import type { OperationUpdate, Mismatch } from '../types';
import { ComparisonMode, isValidPropName } from '../types';
import { getComparator, getComparisonModeForProp } from './Comparators';

export type SingleViewSnapshot = Array<OperationUpdate>;
export type MultiViewSnapshot = Record<number, SingleViewSnapshot>;
export type Snapshot = SingleViewSnapshot | MultiViewSnapshot;

function isJsAndNativeSnapshotsEqual(
  jsSnapshots: Array<OperationUpdate>,
  nativeSnapshots: Array<OperationUpdate>,
  i: number,
  expectNegativeValueMismatch: boolean,
): boolean {
  /**
      The TestRunner can collect two types of snapshots:
      - JS snapshots: animation updates sent via `_updateProps`
      - Native snapshots: snapshots obtained from the native side via `getViewProp`

      Updates applied through `_updateProps` are not synchronously applied to the native side.
      Instead, they are batched and applied at the end of each frame. Therefore, it is not allowed
      to take a native snapshot immediately after the `_updateProps` call. To address this issue,
      we need to wait for the next frame before capturing the native snapshot.
      That's why native snapshots are one frame behind JS snapshots. To account for this delay,
      one additional native snapshot is taken during the execution of the `getNativeSnapshots` function.
   */

  const jsSnapshot = jsSnapshots[i];
  const nativeSnapshot = nativeSnapshots[i + 1];

  const keys = Object.keys(jsSnapshot) as Array<keyof OperationUpdate>;
  for (const key of keys) {
    const jsValue = jsSnapshot[key];
    const nativeValue = nativeSnapshot[key];
    const comparisonMode = isValidPropName(key) ? getComparisonModeForProp(key) : ComparisonMode.AUTO;
    const isEqual = getComparator(comparisonMode);
    const expectMismatch = jsValue < 0 && expectNegativeValueMismatch;
    const valuesAreMatching = isEqual(jsValue, nativeValue);
    if ((!valuesAreMatching && !expectMismatch) || (valuesAreMatching && expectMismatch)) {
      return false;
    }
  }
  return true;
}

/**
      The TestRunner can collect two types of snapshots:
      - **JS snapshots:** animation updates sent via `_updateProps`
      - **Native snapshots:** snapshots obtained from the native side via `getViewProp`
      The purpose of this function is to compare this two suits of snapshots.

      @param expectNegativeValueMismatch - Some props expose unexpected behavior, when negative.
      For example negative `width` may render a full-width component.
      It means that JS snapshot is negative and the native one is positive, which is a valid behavior.
      Set this property to true to expect all comparisons with negative value of JS snapshot **NOT** to match.
   */
function compareSingleViewNativeSnapshots(
  nativeSnapshots: SingleViewSnapshot,
  jsUpdates: Array<OperationUpdate>,
  expectNegativeValueMismatch = false,
): string | undefined {
  if (!nativeSnapshots || !jsUpdates) {
    return `Missing snapshot`;
  }
  if (jsUpdates.length !== nativeSnapshots.length - 1 && jsUpdates.length !== nativeSnapshots.length) {
    return `Expected ${green(jsUpdates.length)} snapshots, but received ${red(nativeSnapshots.length - 1)} snapshots\n`;
  }
  const mismatchedSnapshots: Array<Mismatch> = [];
  for (let i = 0; i < jsUpdates.length - 1; i++) {
    if (!isJsAndNativeSnapshotsEqual(jsUpdates, nativeSnapshots, i, expectNegativeValueMismatch)) {
      mismatchedSnapshots.push({ index: i, expectedSnapshot: nativeSnapshots[i + 1], capturedSnapshot: jsUpdates[i] });
    }
  }
  return mismatchedSnapshots.length === 0 ? undefined : formatSnapshotMismatch(mismatchedSnapshots, true);
}

function compareSingleViewJsSnapshots(
  expectedSnapshots: SingleViewSnapshot,
  capturedSnapshots: SingleViewSnapshot,
): string | undefined {
  const mismatchedSnapshots: Array<Mismatch> = [];
  if (expectedSnapshots.length !== capturedSnapshots.length) {
    return `Expected ${green(expectedSnapshots.length)} snapshots, but received ${red(
      capturedSnapshots.length,
    )} snapshots\n`;
  }
  expectedSnapshots.forEach((expectedSnapshot: OperationUpdate, index: number) => {
    const capturedSnapshot = capturedSnapshots[index];
    const isEquals = getComparator(ComparisonMode.AUTO);
    if (!isEquals(expectedSnapshot, capturedSnapshot)) {
      mismatchedSnapshots.push({ index, expectedSnapshot, capturedSnapshot });
    }
  });
  if (mismatchedSnapshots.length > 0) {
    return formatSnapshotMismatch(mismatchedSnapshots, false);
  }
}

export function compareSnapshots(
  expectedSnapshots: SingleViewSnapshot | Record<number, SingleViewSnapshot>,
  capturedSnapshots: SingleViewSnapshot | Record<number, SingleViewSnapshot>,
  native: boolean,
  expectNegativeValueMismatch = false,
): string | null {
  let errorMessage = '';

  const compareSingleViewSnapshots = (expected: SingleViewSnapshot, captured: SingleViewSnapshot) => {
    return native
      ? compareSingleViewNativeSnapshots(expected, captured, expectNegativeValueMismatch)
      : compareSingleViewJsSnapshots(expected, captured);
  };

  if (Array.isArray(expectedSnapshots)) {
    if (!Array.isArray(capturedSnapshots)) {
      return `Expected snapshots of ${green('only one')} view, received snapshots of ${red(
        Object.keys(capturedSnapshots).length,
      )}`;
    } else {
      if (!Array.isArray(capturedSnapshots)) {
        return `Unexpected type of captured snapshots: ${typeof capturedSnapshots}`;
      }
      const err = compareSingleViewSnapshots(expectedSnapshots, capturedSnapshots);
      if (err) {
        errorMessage = 'Snapshot mismatch: \n' + err;
      }
    }
  }

  if (!Array.isArray(expectedSnapshots) && typeof expectedSnapshots === 'object') {
    const expectedViewNum = Object.keys(expectedSnapshots)?.length;
    const capturedViewNum = Object.keys(capturedSnapshots)?.length;

    if (Array.isArray(capturedSnapshots)) {
      return `Expected snapshots of ${green(expectedViewNum)} views, received only ${red('one')}`;
    } else {
      if (!capturedSnapshots || typeof capturedSnapshots !== 'object') {
        return `Unexpected type of captured snapshots: ${typeof capturedSnapshots}`;
      }
      if (expectedViewNum !== capturedViewNum) {
        return `Expected snapshots of ${green(expectedViewNum)} views, received ${red(capturedViewNum)}`;
      }
      // order of view in snapshots is constant, so we can compare them one by one
      for (let i = 0; i < expectedViewNum; i++) {
        const viewErrorMessage = compareSingleViewSnapshots(expectedSnapshots[i], capturedSnapshots[i]);
        if (viewErrorMessage) {
          errorMessage += `Snapshot mismatch for view ${i}: \n` + viewErrorMessage;
        }
      }
    }
  }

  if (!Array.isArray(expectedSnapshots) && typeof expectedSnapshots !== 'object') {
    errorMessage = `Unexpected type of the ${native ? 'JS' : 'expected'} snapshot ` + red(typeof expectedSnapshots);
  }
  if (!Array.isArray(capturedSnapshots) && typeof capturedSnapshots !== 'object') {
    errorMessage = `Unexpected type of snapshot ` + red(typeof expectedSnapshots);
  }

  return errorMessage !== '' ? `${native ? yellow('Native Snapshot: ') : ''}${errorMessage}` : null;
}
