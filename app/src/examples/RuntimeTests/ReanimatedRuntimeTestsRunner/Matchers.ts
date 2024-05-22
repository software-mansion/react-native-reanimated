import { getComparator } from './Comparators';
import { appendWhiteSpaceToMatchLength, color } from './stringFormatUtils';
import { ComparisonMode, OperationUpdate, TestCase, TestValue, NullableTestValue, TrackerCallCount } from './types';

type ToBeArgs = [TestValue, ComparisonMode?];
type ToBeWithinRangeArgs = [number, number];
type ToBeCalledArgs = [number];

type MatcherArguments = ToBeArgs | ToBeCalledArgs | ToBeWithinRangeArgs;

type Matcher<Args extends MatcherArguments> = (
  currentValue: TestValue,
  ...args: Args
) => {
  pass: boolean;
  message: string;
};

export class Matchers {
  private _negation = false;
  constructor(private _currentValue: TestValue, private _testCase: TestCase) {}

  private static _assertValueIsCallTracker(value: TrackerCallCount | TestValue): asserts value is TrackerCallCount {
    if (typeof value !== 'object' || !(value !== null && 'name' in value && 'onJS' in value && 'onUI' in value)) {
      throw Error('Invalid value');
    }
  }

  private _toBeMatcher: Matcher<ToBeArgs> = (currentValue, expectedValue, comparisonModeUnknown) => {
    const comparisonMode: ComparisonMode =
      typeof comparisonModeUnknown === 'string' && comparisonModeUnknown in ComparisonMode
        ? (comparisonModeUnknown as ComparisonMode)
        : ComparisonMode.AUTO;

    const isEqual = getComparator(comparisonMode);

    const coloredExpected = color(expectedValue, 'green');
    const coloredReceived = color(currentValue, 'red');
    const coloredMode = color(comparisonMode, 'yellow');

    return {
      pass: isEqual(expectedValue, currentValue),
      message: `Expected${
        this._negation ? ' NOT' : ''
      } ${coloredExpected} received ${coloredReceived}, mode: ${coloredMode}`,
    };
  };

  private _toBeWithinRangeMatcher: Matcher<ToBeWithinRangeArgs> = (currentValue, minimumValue, maximumValue) => {
    const currentValueAsNumber = Number(Number(currentValue));
    const validInputTypes = typeof minimumValue === 'number' && typeof maximumValue === 'number';
    const isWithinRange = Number(minimumValue) <= currentValueAsNumber && currentValueAsNumber <= Number(maximumValue);

    const coloredExpected = color(`[${minimumValue}, ${maximumValue}]`, 'green');
    const coloredReceived = color(currentValue, 'red');

    return {
      pass: isWithinRange && validInputTypes,
      message: `Expected the value ${
        this._negation ? ' NOT' : ''
      }to be in range ${coloredExpected} received ${coloredReceived}`,
    };
  };

  private _toBeCalledMatcher: Matcher<ToBeCalledArgs> = (currentValue, times) => {
    Matchers._assertValueIsCallTracker(currentValue);
    const callsCount = currentValue.onUI + currentValue.onJS;
    const name = color(currentValue.name, 'green');
    const expected = color(times, 'green');
    const received = color(callsCount, 'red');
    return {
      pass: callsCount === times,
      message: `Expected ${name}${
        this._negation ? ' NOT' : ''
      } to be called ${expected} times, but was called ${received} times`,
    };
  };

  private _toBeCalledUIMatcher: Matcher<ToBeCalledArgs> = (currentValue, times) => {
    Matchers._assertValueIsCallTracker(currentValue);
    const callsCount = currentValue.onUI;
    const name = color(currentValue.name, 'green');
    const threadName = color('UI thread', 'cyan');
    const expected = color(times, 'green');
    const received = color(callsCount, 'red');

    return {
      pass: callsCount === times,
      message: `Expected ${name}${
        this._negation ? ' NOT' : ''
      } to be called ${expected} times on ${threadName}, but was called ${received} times`,
    };
  };

  private _toBeCalledJSMatcher: Matcher<ToBeCalledArgs> = (currentValue, times) => {
    Matchers._assertValueIsCallTracker(currentValue);
    const callsCount = currentValue.onJS;
    const name = color(currentValue.name, 'green');
    const threadName = color('JS thread', 'cyan');
    const expected = color(times, 'green');
    const received = color(callsCount, 'red');

    return {
      pass: callsCount === times,
      message: `Expected ${name}${
        this._negation ? ' NOT' : ''
      } to be called ${expected} times on ${threadName}, but was called ${received} times`,
    };
  };

  private decorateMatcher<MatcherArgs extends MatcherArguments>(matcher: Matcher<MatcherArgs>) {
    return (...args: MatcherArgs) => {
      const { pass, message } = matcher(this._currentValue, ...args);
      if ((!pass && !this._negation) || (pass && this._negation)) {
        this._testCase.errors.push(message);
      }
    };
  }

  public toBe = this.decorateMatcher(this._toBeMatcher);
  public toBeWithinRange = this.decorateMatcher(this._toBeWithinRangeMatcher);
  public toBeCalled = this.decorateMatcher(this._toBeCalledMatcher);
  public toBeCalledUI = this.decorateMatcher(this._toBeCalledUIMatcher);
  public toBeCalledJS = this.decorateMatcher(this._toBeCalledJSMatcher);

  get not() {
    this._negation = true;
    return this;
  }

  public toMatchSnapshots(expectedSnapshots: Array<Record<string, unknown>>) {
    const capturedSnapshots = this._currentValue as Array<Record<string, unknown>>;
    if (capturedSnapshots.length !== expectedSnapshots.length) {
      const errorMessage = this.formatMismatchLengthErrorMessage(expectedSnapshots.length, capturedSnapshots.length);
      this._testCase.errors.push(errorMessage);
    }
    let errorString = '';
    expectedSnapshots.forEach((expectedSnapshots: Record<string, unknown>, index: number) => {
      const capturedSnapshot = capturedSnapshots[index];
      const isEquals = getComparator(ComparisonMode.AUTO);
      if (!isEquals(expectedSnapshots, capturedSnapshot)) {
        const expected = color(`${JSON.stringify(expectedSnapshots)}`, 'green');
        const received = color(`${JSON.stringify(capturedSnapshot)}`, 'red');
        errorString += `\tAt index ${index}:\n\t\texpected: ${expected}\n\t\treceived: ${received}\n`;
      }
    });
    if (errorString !== '') {
      this._testCase.errors.push('Snapshot mismatch: \n' + errorString);
    }
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
  public toMatchNativeSnapshots(nativeSnapshots: Array<OperationUpdate>, expectNegativeMismatch = false) {
    let errorString = '';
    const jsUpdates = this._currentValue as Array<OperationUpdate>;

    if (jsUpdates.length !== nativeSnapshots.length - 1) {
      errorString += `Expected ${jsUpdates.length} snapshots, but received ${nativeSnapshots.length - 1} snapshots\n`;
    } else {
      for (let i = 0; i < jsUpdates.length; i++) {
        errorString += this.compareJsAndNativeSnapshot(jsUpdates, nativeSnapshots, i, expectNegativeMismatch);
      }
    }

    if (errorString !== '') {
      this._testCase.errors.push('Native snapshot mismatch: \n' + errorString);
    }
  }

  private compareJsAndNativeSnapshot(
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
    const keys = Object.keys(jsSnapshot);
    for (const key of keys) {
      const typedKey = key as keyof OperationUpdate;
      const jsValue = jsSnapshot[typedKey];
      const nativeValue = nativeSnapshot[typedKey];
      const isEqual = getComparator(ComparisonMode.AUTO);

      const expectMismatch = jsValue < 0 && expectNegativeMismatch;
      const valuesAreMatching = isEqual(jsValue, nativeValue);
      if ((!valuesAreMatching && !expectMismatch) || (valuesAreMatching && expectMismatch)) {
        errorString += this.formatSnapshotErrorMessage(jsValue, nativeValue, key, i);
      }
    }
    return errorString;
  }

  private formatSnapshotErrorMessage(jsValue: TestValue, nativeValue: TestValue, propName: string, index: number) {
    const expected = color(jsValue, 'green');
    const received = color(nativeValue, 'red');
    return `\tIndex ${index} ${propName}\t expected: ${appendWhiteSpaceToMatchLength(
      expected,
      30,
    )} received: ${appendWhiteSpaceToMatchLength(received, 30)}\n`;
  }

  private formatMismatchLengthErrorMessage(expectedLength: number, receivedLength: number) {
    const expected = color(expectedLength, 'green');
    const received = color(receivedLength, 'red');
    return `Expected ${expected} snapshots, but received ${received} snapshots\n`;
  }
}

export function nullableMatch(currentValue: NullableTestValue, testCase: TestCase, negation: boolean = false) {
  const pass = currentValue === null || currentValue === undefined;

  const coloredExpected = color('nullable', 'green');
  const coloredReceived = color(currentValue, 'red');
  const message = `Expected${negation ? ' NOT' : ''} ${coloredExpected} received ${coloredReceived}`;

  if ((!pass && !negation) || (pass && negation)) {
    testCase.errors.push(message);
  }
}
