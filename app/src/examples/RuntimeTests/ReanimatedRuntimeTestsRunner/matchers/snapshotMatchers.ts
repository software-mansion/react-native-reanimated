import { appendWhiteSpaceToMatchLength, green, red, yellow } from '../stringFormatUtils';
import { OperationUpdate, ComparisonMode, TestValue, isValidPropName } from '../types';
import { getComparator, getComparisonModeForProp } from './Comparators';

export type SingleViewSnapshot = Array<OperationUpdate>;
export type MultiViewSnapshot = Record<number, SingleViewSnapshot>;
export type Snapshot = SingleViewSnapshot | MultiViewSnapshot;

function formatSnapshotErrorMessage(jsValue: TestValue, nativeValue: TestValue, propName: string, index: number) {
  const preIndexSpace = (index < 100 ? ' ' : '') + (index < 10 ? ' ' : '');
  return `\tIndex ${preIndexSpace}${index} ${propName}\t expected: ${appendWhiteSpaceToMatchLength(
    green(jsValue),
    30,
  )} received: ${red(appendWhiteSpaceToMatchLength(JSON.stringify(nativeValue), 30))}\n`;
}

function compareJsAndNativeSnapshot(
  jsSnapshots: Array<OperationUpdate>,
  nativeSnapshots: Array<OperationUpdate>,
  i: number,
  expectNegativeMismatch: Boolean,
) {
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

  let errorString = '';
  const jsSnapshot = jsSnapshots[i];
  const nativeSnapshot = nativeSnapshots[i + 1];
  const keys = Object.keys(jsSnapshot) as Array<keyof OperationUpdate>;
  for (const key of keys) {
    const jsValue = jsSnapshot[key];
    const nativeValue = nativeSnapshot[key];
    const comparisonMode = isValidPropName(key) ? getComparisonModeForProp(key) : ComparisonMode.AUTO;
    const isEqual = getComparator(comparisonMode);
    const expectMismatch = jsValue < 0 && expectNegativeMismatch;
    const valuesAreMatching = isEqual(jsValue, nativeValue);
    if ((!valuesAreMatching && !expectMismatch) || (valuesAreMatching && expectMismatch)) {
      errorString += formatSnapshotErrorMessage(jsValue, nativeValue, key, i);
    }
  }
  return errorString;
}

/**
      The TestRunner can collect two types of snapshots:
      - **JS snapshots:** animation updates sent via `_updateProps`
      - **Native snapshots:** snapshots obtained from the native side via `getViewProp`
      The purpose of this function is to compare this two suits of snapshots.

      @param expectNegativeMismatch - Some props expose unexpected behavior, when negative.
      For example negative `width` may render a full-width component.
      It means that JS snapshot is negative and the native one is positive, which is a valid behavior.
      Set this property to true to expect all comparisons with negative value of JS snapshot **NOT** to match.
   */
function compareSingleViewNativeSnapshots(
  nativeSnapshots: SingleViewSnapshot,
  jsUpdates: Array<OperationUpdate>,
  expectNegativeMismatch = false,
): string | undefined {
  if (jsUpdates.length !== nativeSnapshots.length - 1 && jsUpdates.length !== nativeSnapshots.length) {
    return `Expected ${green(jsUpdates.length)} snapshots, but received ${red(nativeSnapshots.length - 1)} snapshots\n`;
  }
  let errorString = '';
  for (let i = 0; i < jsUpdates.length - 1; i++) {
    errorString += compareJsAndNativeSnapshot(jsUpdates, nativeSnapshots, i, expectNegativeMismatch);
  }
  return errorString === '' ? undefined : errorString;
}

function compareSingleViewJsSnapshots(
  expectedSnapshots: SingleViewSnapshot,
  capturedSnapshots: SingleViewSnapshot,
): string | undefined {
  if (expectedSnapshots.length !== capturedSnapshots.length) {
    return `Expected ${green(expectedSnapshots.length)} snapshots, but received ${red(
      capturedSnapshots.length,
    )} snapshots\n`;
  }
  let errorString = '';
  expectedSnapshots.forEach((expectedSnapshots: OperationUpdate, index: number) => {
    const capturedSnapshot = capturedSnapshots[index];
    const isEquals = getComparator(ComparisonMode.AUTO);
    if (!isEquals(expectedSnapshots, capturedSnapshot)) {
      errorString += `\tAt index ${index}:\n\t\texpected: ${green(expectedSnapshots)}\n\t\treceived: ${red(
        capturedSnapshot,
      )}\n`;
    }
  });
  if (errorString !== '') {
    return errorString;
  }
  return;
}

export function compareSnapshots(
  expectedSnapshots: SingleViewSnapshot | Record<number, SingleViewSnapshot>,
  capturedSnapshots: SingleViewSnapshot | Record<number, SingleViewSnapshot>,
  native: boolean,
  expectNegativeMismatch = false,
): string | null {
  let errorMessage = '';

  const compareSingleViewSnapshots = (expected: SingleViewSnapshot, captured: SingleViewSnapshot) => {
    return native
      ? compareSingleViewNativeSnapshots(expected, captured, expectNegativeMismatch)
      : compareSingleViewJsSnapshots(expected, captured);
  };

  if (Array.isArray(expectedSnapshots)) {
    if (!Array.isArray(capturedSnapshots)) {
      return `Expected snapshots of ${green('only one')} view, received snapshots of ${red(
        Object.keys(capturedSnapshots).length,
      )}`;
    } else {
      const err = compareSingleViewSnapshots(expectedSnapshots, capturedSnapshots);
      if (err) {
        errorMessage = 'Snapshot mismatch: \n' + err;
      }
    }
  }

  if (!Array.isArray(expectedSnapshots) && typeof expectedSnapshots === 'object') {
    const expectedViewNum = Object.keys(expectedSnapshots).length;
    const capturedViewNum = Object.keys(capturedSnapshots).length;

    if (Array.isArray(capturedSnapshots)) {
      return `Expected snapshots of ${green(expectedViewNum)} views, received only ${red('one')}`;
    } else {
      if (expectedViewNum !== capturedViewNum) {
        return `Expected snapshots of ${green(expectedViewNum)} views, received ${red(capturedViewNum)}`;
      }
      //order of view in snapshots is constant, so we can compare them one by one
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
