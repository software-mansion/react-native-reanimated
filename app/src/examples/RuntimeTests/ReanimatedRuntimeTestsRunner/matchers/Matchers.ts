import { color } from '../stringFormatUtils';
import { TestCase, TestValue, NullableTestValue } from '../types';
import {
  toBeMatcher,
  toBeWithinRangeMatcher,
  toBeCalledMatcher,
  toBeCalledUIMatcher,
  toBeCalledJSMatcher,
  Matcher,
  MatcherArguments,
} from './rawMatchers';
import { SingleViewSnapshot, getSnapshotMismatchError } from './snapshotMatchers';

export class Matchers {
  private _negation = false;
  constructor(private _currentValue: TestValue, private _testCase: TestCase) {}

  get not() {
    this._negation = true;
    return this;
  }

  private decorateMatcher<MatcherArgs extends MatcherArguments>(matcher: Matcher<MatcherArgs>) {
    return (...args: MatcherArgs) => {
      const { pass, message } = matcher(this._currentValue, this._negation, ...args);
      if ((!pass && !this._negation) || (pass && this._negation)) {
        this._testCase.errors.push(message);
      }
    };
  }

  public toBe = this.decorateMatcher(toBeMatcher);
  public toBeWithinRange = this.decorateMatcher(toBeWithinRangeMatcher);
  public toBeCalled = this.decorateMatcher(toBeCalledMatcher);
  public toBeCalledUI = this.decorateMatcher(toBeCalledUIMatcher);
  public toBeCalledJS = this.decorateMatcher(toBeCalledJSMatcher);

  public toMatchSnapshots(expectedSnapshots: SingleViewSnapshot | Record<number, SingleViewSnapshot>) {
    const capturedSnapshots = this._currentValue as SingleViewSnapshot | Record<number, SingleViewSnapshot>;
    const mismatchError = getSnapshotMismatchError(expectedSnapshots, capturedSnapshots, false);
    if (mismatchError) {
      this._testCase.errors.push(mismatchError);
    }
  }
  public toMatchNativeSnapshots(
    expectedSnapshots: SingleViewSnapshot | Record<number, SingleViewSnapshot>,
    expectNegativeMismatch = false,
  ) {
    const capturedSnapshots = this._currentValue as SingleViewSnapshot | Record<number, SingleViewSnapshot>;
    const mismatchError = getSnapshotMismatchError(expectedSnapshots, capturedSnapshots, true, expectNegativeMismatch);
    if (mismatchError) {
      this._testCase.errors.push(mismatchError);
    }
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
