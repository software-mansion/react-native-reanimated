import { getComparator } from './Comparators';
import { color, defaultTestErrorLog } from './LogMessageUtils';
import {
  ComparisonMode,
  OperationUpdate,
  TestCase,
  TestValue,
  TrackerCallCount,
} from './types';

type MatcherFunction = (
  currentValue: TestValue,
  expectedValue: TestValue,
  ...additionalArgs: Array<unknown>
) => {
  pass: boolean;
  message: string;
  messageNegated?: string;
};

export class Matchers {
  constructor(private _currentValue: TestValue, private _testCase: TestCase) {}

  private static _assertValueIsCallTracker(
    value: TrackerCallCount | TestValue
  ): asserts value is TrackerCallCount {
    if (
      typeof value !== 'object' ||
      !('name' in value && 'onJS' in value && 'onUI' in value)
    ) {
      throw Error('Invalid value');
    }
  }

  private static _toBeMatcher: MatcherFunction = (
    currentValue: TestValue,
    expectedValue: TestValue,
    comparisonModeUnknown: unknown
  ) => {
    const comparisonMode: ComparisonMode =
      typeof comparisonModeUnknown === 'string' &&
      comparisonModeUnknown in ComparisonMode
        ? (comparisonModeUnknown as ComparisonMode)
        : ComparisonMode.AUTO;

    const isEqual = getComparator(comparisonMode);

    return {
      pass: isEqual(expectedValue, currentValue),
      message: defaultTestErrorLog(expectedValue, currentValue, comparisonMode),
      messageNegated: defaultTestErrorLog(
        expectedValue,
        currentValue,
        comparisonMode,
        true
      ),
    };
  };

  private static _toBeCalledMatcher: MatcherFunction = (
    currentValue: TestValue,
    times = 1
  ) => {
    Matchers._assertValueIsCallTracker(currentValue);
    const callsCount = currentValue.onUI + currentValue.onJS;
    const name = color(currentValue.name, 'green');
    const expected = color(times, 'green');
    const received = color(callsCount, 'red');
    return {
      pass: callsCount === times,
      message: `Expected ${name} to be called ${expected} times, but was called ${received} times`,
      messageNegated: `Expected ${name} NOT to be called ${expected} times`,
    };
  };

  private static _toBeCalledUIMatcher: MatcherFunction = (
    currentValue: TestValue,
    times = 1
  ) => {
    Matchers._assertValueIsCallTracker(currentValue);
    const callsCount = currentValue.onUI;
    const name = color(currentValue.name, 'green');
    const threadName = color('UI thread', 'cyan');
    const expected = color(times, 'green');
    const received = color(callsCount, 'red');

    return {
      pass: callsCount === times,
      message: `Expected ${name} to be called ${expected} times on ${threadName}, but was called ${received} times`,
      messageNegated: `Expected ${name} NOT to be called ${expected} times on ${threadName}`,
    };
  };

  private static _toBeCalledJSMatcher: MatcherFunction = (
    currentValue: TestValue,
    times = 1
  ) => {
    Matchers._assertValueIsCallTracker(currentValue);
    Matchers._assertValueIsCallTracker(currentValue);
    const callsCount = currentValue.onJS;
    const name = color(currentValue.name, 'green');
    const threadName = color('JS thread', 'cyan');
    const expected = color(times, 'green');
    const received = color(callsCount, 'red');

    return {
      pass: callsCount === times,
      message: `Expected ${name} to be called ${expected} times on ${threadName}, but was called ${received} times`,
      messageNegated: `Expected ${name} NOT to be called ${expected} times on ${threadName}`,
    };
  };

  private makeThrowingMatcher(matcher: MatcherFunction, isNot = false) {
    return (expectedValue: TestValue, ...args: Array<unknown>) => {
      const { pass, message, messageNegated } = matcher(
        this._currentValue,
        expectedValue,
        ...args
      );
      if ((!pass && !isNot) || (pass && isNot)) {
        this._testCase.errors.push(
          isNot && messageNegated ? messageNegated : message
        );
      }
    };
  }

  public toBe = this.makeThrowingMatcher(Matchers._toBeMatcher);
  public toBeCalled = this.makeThrowingMatcher(Matchers._toBeCalledMatcher);
  public toBeCalledUI = this.makeThrowingMatcher(Matchers._toBeCalledUIMatcher);
  public toBeCalledJS = this.makeThrowingMatcher(Matchers._toBeCalledJSMatcher);

  public not = {
    toBe: this.makeThrowingMatcher(Matchers._toBeMatcher, true),
    toBeCalled: this.makeThrowingMatcher(Matchers._toBeCalledMatcher, true),
    toBeCalledUI: this.makeThrowingMatcher(Matchers._toBeCalledUIMatcher, true),
    toBeCalledJS: this.makeThrowingMatcher(Matchers._toBeCalledJSMatcher, true),
  };

  public toMatchSnapshot(expectedSnapshots: Array<Record<string, unknown>>) {
    const capturedSnapshots = this._currentValue as Array<
      Record<string, unknown>
    >;
    if (capturedSnapshots.length !== expectedSnapshots.length) {
      const errorMessage = this.formatMismatchLengthErrorMessage(
        expectedSnapshots.length,
        capturedSnapshots.length
      );
      this._testCase.errors.push(errorMessage);
    }
    let errorString = '';
    expectedSnapshots.forEach(
      (expectedSnapshots: Record<string, unknown>, index: number) => {
        const capturedSnapshot = capturedSnapshots[index];
        const isEquals = getComparator(ComparisonMode.AUTO);
        if (!isEquals(expectedSnapshots, capturedSnapshot)) {
          const expected = color(
            `${JSON.stringify(expectedSnapshots)}`,
            'green'
          );
          const received = color(`${JSON.stringify(capturedSnapshot)}`, 'red');
          errorString += `\tAt index ${index}:\n\t\texpected: ${expected}\n\t\treceived: ${received}\n`;
        }
      }
    );
    if (errorString !== '') {
      this._testCase.errors.push('Snapshot mismatch: \n' + errorString);
    }
  }

  public toMatchNativeSnapshots(nativeSnapshots: Array<OperationUpdate>) {
    /*
      The TestRunner can collect two types of snapshots:
      - JS snapshots: animation updates sent via `_updateProps`
      - Native snapshots: snapshots obtained from the native side via `getViewProp`
      Updates applied through `_updateProps` are not synchronously applied to the native side. Instead, they are batched and applied at the end of each frame. Therefore, it is not allowed to take a native snapshot immediately after the `_updateProps` call. To address this issue, we need to wait for the next frame before capturing the native snapshot. That's why native snapshots are one frame behind JS snapshots. To account for this delay, one additional native snapshot is taken during the execution of the `getNativeSnapshots` function.
    */
    let errorString = '';
    const jsUpdates = this._currentValue as Array<OperationUpdate>;
    for (let i = 0; i < jsUpdates.length; i++) {
      errorString += this.compareJsAndNativeSnapshot(
        jsUpdates,
        nativeSnapshots,
        i
      );
    }
    if (jsUpdates.length !== nativeSnapshots.length - 1) {
      errorString += `Expected ${jsUpdates.length} snapshots, but received ${
        nativeSnapshots.length - 1
      } snapshots\n`;
    }
    if (errorString !== '') {
      this._testCase.errors.push('Native snapshot mismatch: \n' + errorString);
    }
  }

  private compareJsAndNativeSnapshot(
    jsSnapshots: Array<OperationUpdate>,
    nativeSnapshots: Array<OperationUpdate>,
    i: number
  ) {
    let errorString = '';
    const jsSnapshot = jsSnapshots[i];
    const nativeSnapshot = nativeSnapshots[i + 1];
    const keys = Object.keys(jsSnapshot);
    for (const key of keys) {
      const typedKey = key as keyof OperationUpdate;
      const jsValue = jsSnapshot[typedKey];
      const nativeValue = nativeSnapshot[typedKey];
      const isEqual = getComparator(ComparisonMode.AUTO);
      if (!isEqual(jsValue, nativeValue)) {
        errorString += this.formatSnapshotErrorMessage(
          jsValue,
          nativeValue,
          key,
          i
        );
      }
    }
    return errorString;
  }

  private formatSnapshotErrorMessage(
    jsValue: TestValue,
    nativeValue: TestValue,
    propName: string,
    index: number
  ) {
    const expected = color(jsValue, 'green');
    const received = color(nativeValue, 'red');
    return `\tAt index ${index}, value of prop ${propName}:\n\t\texpected: ${expected}\n\t\treceived: ${received}\n`;
  }

  private formatMismatchLengthErrorMessage(
    expectedLength: number,
    receivedLength: number
  ) {
    const expected = color(expectedLength, 'green');
    const received = color(receivedLength, 'red');
    return `Expected ${expected} snapshots, but received ${received} snapshots\n`;
  }
}