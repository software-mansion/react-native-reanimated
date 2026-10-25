import type { SingleViewSnapshot } from '../TestRunner/UpdatesContainer';
import type { Mismatch, OperationUpdate } from '../types';
import { ComparisonMode, isValidPropName } from '../types';
import { formatSnapshotMismatch } from '../utils/drawSnapshotTable';
import { green, red, yellow } from '../utils/stringFormatUtils';
import {
  getComparator,
  getComparisonModeForProp,
  getNativeComparator,
} from './Comparators';

function compareSnapshot(
  expectedSnapshot: OperationUpdate,
  capturedSnapshot: OperationUpdate,
  native: boolean,
  expectNegativeValueMismatch: boolean
) {
  const keys = Object.keys(capturedSnapshot) as Array<keyof OperationUpdate>;
  for (const key of keys) {
    const jsValue = capturedSnapshot[key];
    const nativeValue = expectedSnapshot[key];
    const comparisonMode = isValidPropName(key)
      ? getComparisonModeForProp(key)
      : ComparisonMode.AUTO;
    const isEqual = native
      ? getNativeComparator(comparisonMode, key)
      : getComparator(comparisonMode);
    const expectMismatch = jsValue < 0 && expectNegativeValueMismatch;
    const valuesAreMatching = isEqual(jsValue, nativeValue);
    if (
      (!valuesAreMatching && !expectMismatch) ||
      (valuesAreMatching && expectMismatch)
    ) {
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
  offset = Number(native)
) {
  const mismatchedSnapshots: Array<Mismatch> = [];

  const matchingLength =
    expectedSnapshots.length === capturedSnapshots.length + offset;
  if (!matchingLength) {
    return `Expected ${green(expectedSnapshots.length - offset)} snapshots, but received ${red(
      capturedSnapshots.length
    )} snapshots\n`;
  }

  for (let i = 0; i < capturedSnapshots.length; i++) {
    const capturedSnapshot = capturedSnapshots[i];
    const expectedSnapshot = expectedSnapshots[i + offset];
    const snapshotMatching = compareSnapshot(
      expectedSnapshot,
      capturedSnapshot,
      native,
      expectNegativeValueMismatch
    );
    if (!snapshotMatching) {
      mismatchedSnapshots.push({
        index: i,
        expectedSnapshot: expectedSnapshots[i + offset],
        capturedSnapshot: capturedSnapshots[i],
      });
    }
  }

  if (mismatchedSnapshots.length > 0) {
    return formatSnapshotMismatch(mismatchedSnapshots, native);
  }
}

/**
 * The TestRunner can collect two types of snapshots:
 *
 * - **JS snapshots:** animation updates sent via `_updateProps`
 * - **Native snapshots:** snapshots obtained from the native side via
 *   `getViewProp` The purpose of this function is to compare this two suits of
 *   snapshots.
 *
 * @param expectNegativeValueMismatch - Some props expose unexpected behavior,
 *   when negative. For example negative `width` may render a full-width
 *   component. It means that JS snapshot is negative and the native one is
 *   positive, which is a valid behavior. Set this property to true to expect
 *   all comparisons with negative value of JS snapshot **NOT** to match.
 */
function compareSingleViewNativeSnapshots(
  nativeSnapshots: SingleViewSnapshot,
  jsUpdates: Array<OperationUpdate>,
  expectNegativeValueMismatch = false,
  offset = 1
): string | undefined {
  return compareSingleViewSnapshots(
    nativeSnapshots,
    jsUpdates,
    true,
    expectNegativeValueMismatch,
    offset
  );
}

function compareSingleViewJsSnapshots(
  expectedSnapshots: SingleViewSnapshot,
  capturedSnapshots: SingleViewSnapshot
): string | undefined {
  return compareSingleViewSnapshots(
    expectedSnapshots,
    capturedSnapshots,
    false,
    false
  );
}

function isSingleViewSnapshot(
  snapshot: unknown
): snapshot is SingleViewSnapshot {
  if (!Array.isArray(snapshot)) {
    return false;
  }
  const allElementsAreObjects = snapshot.reduce(
    (accumulator, currentValue) =>
      accumulator && typeof currentValue === 'object',
    true
  );
  return allElementsAreObjects;
}

export function compareSnapshots(
  expectedSnapshots: unknown,
  capturedSnapshots: unknown,
  native: boolean,
  expectNegativeValueMismatch = false,
  offset = Number(native)
): string | null {
  let errorMessage = '';

  if (!isSingleViewSnapshot(expectedSnapshots)) {
    errorMessage += `Unexpected type of expected snapshots: ${typeof capturedSnapshots}\n`;
  } else if (!isSingleViewSnapshot(capturedSnapshots)) {
    errorMessage += `Unexpected type of captured snapshots: ${typeof capturedSnapshots}\n`;
  } else {
    const compareSingleViewSnapshots = (
      expected: SingleViewSnapshot,
      captured: SingleViewSnapshot
    ) => {
      return native
        ? compareSingleViewNativeSnapshots(
            expected,
            captured,
            expectNegativeValueMismatch,
            offset
          )
        : compareSingleViewJsSnapshots(expected, captured);
    };

    const err = compareSingleViewSnapshots(
      expectedSnapshots,
      capturedSnapshots
    );
    if (err) {
      errorMessage = 'Snapshot mismatch: \n' + err;
    }
  }

  return errorMessage !== ''
    ? `${native ? yellow('Native Snapshot: ') : ''}${errorMessage}`
    : null;
}
