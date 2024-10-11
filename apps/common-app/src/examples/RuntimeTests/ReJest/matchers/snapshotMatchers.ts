import { green, red, yellow } from '../utils/stringFormatUtils';
import type { OperationUpdate, Mismatch } from '../types';
import { ComparisonMode, isValidPropName } from '../types';
import { getComparator, getComparisonModeForProp } from './Comparators';
import type { SingleViewSnapshot } from '../TestRunner/UpdatesContainer';
import { formatSnapshotMismatch } from '../utils/drawSnapshotTable';

function compareSnapshot(
  expectedSnapshot: OperationUpdate,
  capturedSnapshot: OperationUpdate,
  expectNegativeValueMismatch: boolean,
) {
  const keys = Object.keys(capturedSnapshot) as Array<keyof OperationUpdate>;
  for (const key of keys) {
    const jsValue = capturedSnapshot[key];
    const nativeValue = expectedSnapshot[key];
    const comparisonMode = isValidPropName(key) ? getComparisonModeForProp(key) : ComparisonMode.AUTO;
    const isEqual = getComparator(comparisonMode);
    const expectMismatch = jsValue < 0 && expectNegativeValueMismatch;
    let valuesAreMatching = isEqual(jsValue, nativeValue);

    if (key === 'opacity' && jsValue === 1 && nativeValue === undefined) {
      // undefined opacity may get translated into 1, as it is the default value
      valuesAreMatching = true;
    }

    if ((!valuesAreMatching && !expectMismatch) || (valuesAreMatching && expectMismatch)) {
      return false;
    }
  }
  return true;
}

function compareSingleViewSnapshots(
  expectedSnapshots: SingleViewSnapshot, // native
  capturedSnapshots: SingleViewSnapshot, // js
  native: boolean,
  expectNegativeValueMismatch = false,
) {
  const mismatchedSnapshots: Array<Mismatch> = [];

  const matchingLength = Math.abs(expectedSnapshots.length - capturedSnapshots.length) <= Number(native);
  if (!matchingLength) {
    return `Expected ${green(expectedSnapshots.length - Number(native))} snapshots, but received ${red(
      capturedSnapshots.length,
    )} snapshots\n`;
  }

  for (let i = 0; i < capturedSnapshots.length - 1; i++) {
    const capturedSnapshot = capturedSnapshots[i];
    /**
      The TestRunner can collect two types of snapshots:
      - JS snapshots: animation updates sent via `_updateProps`
      - Native snapshots: snapshots obtained from the native side via `getViewProp`

      Updates applied through `_updateProps` are not synchronously applied to the native side.
      Instead, they are batched and applied at the end of each frame. Therefore, it is not allowed
      to take a native snapshot immediately after the `_updateProps` call. To address this issue,
      we need to wait for the next frame before capturing the native snapshot.
      That's why native snapshots are one frame behind JS snapshots. To account for this delay,
      one additional native snapshot is taken during the execution of the `getNativeSnapshots` function. */
    const expectedSnapshot = expectedSnapshots[i + Number(native)];
    const snapshotMatching = compareSnapshot(expectedSnapshot, capturedSnapshot, expectNegativeValueMismatch);
    if (!snapshotMatching) {
      mismatchedSnapshots.push({
        index: i,
        expectedSnapshot: expectedSnapshots[i + Number(native)],
        capturedSnapshot: capturedSnapshots[i],
      });
    }
  }

  if (mismatchedSnapshots.length > 0) {
    return formatSnapshotMismatch(mismatchedSnapshots, false);
  }
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
  return compareSingleViewSnapshots(nativeSnapshots, jsUpdates, true, expectNegativeValueMismatch);
}

function compareSingleViewJsSnapshots(
  expectedSnapshots: SingleViewSnapshot,
  capturedSnapshots: SingleViewSnapshot,
): string | undefined {
  return compareSingleViewSnapshots(expectedSnapshots, capturedSnapshots, false, false);
}

function isSingleViewSnapshot(snapshot: unknown): snapshot is SingleViewSnapshot {
  if (!Array.isArray(snapshot)) {
    return false;
  }
  const allElementsAreObjects = snapshot.reduce(
    (accumulator, currentValue) => accumulator && typeof currentValue === 'object',
    true,
  );
  return allElementsAreObjects;
}

export function compareSnapshots(
  expectedSnapshots: unknown,
  capturedSnapshots: unknown,
  native: boolean,
  expectNegativeValueMismatch = false,
): string | null {
  let errorMessage = '';

  if (!isSingleViewSnapshot(expectedSnapshots)) {
    errorMessage += `Unexpected type of expected snapshots: ${typeof capturedSnapshots}\n`;
  } else if (!isSingleViewSnapshot(capturedSnapshots)) {
    errorMessage += `Unexpected type of captured snapshots: ${typeof capturedSnapshots}\n`;
  } else {
    const compareSingleViewSnapshots = (expected: SingleViewSnapshot, captured: SingleViewSnapshot) => {
      return native
        ? compareSingleViewNativeSnapshots(expected, captured, expectNegativeValueMismatch)
        : compareSingleViewJsSnapshots(expected, captured);
    };

    const err = compareSingleViewSnapshots(expectedSnapshots, capturedSnapshots);
    if (err) {
      errorMessage = 'Snapshot mismatch: \n' + err;
    }
  }

  return errorMessage !== '' ? `${native ? yellow('Native Snapshot: ') : ''}${errorMessage}` : null;
}
