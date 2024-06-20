import { color } from '../stringFormatUtils';
import type { TestCase, TestValue, NullableTestValue } from '../types';
import type { Matcher, MatcherArguments } from './rawMatchers';
import {
  toBeMatcher,
  toBeWithinRangeMatcher,
  toBeCalledMatcher,
  toBeCalledUIMatcher,
  toBeCalledJSMatcher,
} from './rawMatchers';
import type { SingleViewSnapshot } from './snapshotMatchers';
import { compareSnapshots } from './snapshotMatchers';

export class Matchers {
  private _negation = false;
  // eslint-disable-next-line no-useless-constructor
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
    if (capturedSnapshots) {
      const mismatchError = compareSnapshots(expectedSnapshots, capturedSnapshots, false);
      if (mismatchError) {
        this._testCase.errors.push(mismatchError);
      }
    } else {
      this._testCase.errors.push('Could not capture snapshot');
    }
  }

  public toMatchNativeSnapshots(
    expectedSnapshots: SingleViewSnapshot | Record<number, SingleViewSnapshot>,
    expectNegativeValueMismatch = false,
  ) {
    const capturedSnapshots = this._currentValue as SingleViewSnapshot | Record<number, SingleViewSnapshot>;
    const mismatchError = compareSnapshots(expectedSnapshots, capturedSnapshots, true, expectNegativeValueMismatch);
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
