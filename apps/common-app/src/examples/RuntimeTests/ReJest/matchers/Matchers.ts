import type { TestCase, TestValue } from '../types';
import type { AsyncMatcher, AsyncMatcherArguments, Matcher, SyncMatcherArguments } from './rawMatchers';
import {
  toBeMatcher,
  toBeWithinRangeMatcher,
  toBeCalledMatcher,
  toBeCalledUIMatcher,
  toBeCalledJSMatcher,
  toThrowMatcher,
  toBeNullableMatcher,
} from './rawMatchers';
import { compareSnapshots } from './snapshotMatchers';
import type { SingleViewSnapshot } from '../TestRunner/UpdatesContainer';

export class Matchers {
  private _negation = false;
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private _currentValue: TestValue,
    private _testCase: TestCase,
  ) {}

  get not() {
    this._negation = true;
    return this;
  }

  private decorateMatcher<MatcherArgs extends SyncMatcherArguments>(matcher: Matcher<MatcherArgs>) {
    return (...args: MatcherArgs) => {
      const { pass, message } = matcher(this._currentValue, this._negation, ...args);
      if ((!pass && !this._negation) || (pass && this._negation)) {
        this._testCase.errors.push(message);
      }
    };
  }

  private decorateAsyncMatcher<MatcherArgs extends AsyncMatcherArguments>(matcher: AsyncMatcher<MatcherArgs>) {
    return async (...args: MatcherArgs) => {
      const { pass, message } = await matcher(this._currentValue, this._negation, ...args);
      if ((!pass && !this._negation) || (pass && this._negation)) {
        this._testCase.errors.push(message);
      }
    };
  }

  public toBe = this.decorateMatcher(toBeMatcher);
  public toBeNullable = this.decorateMatcher(toBeNullableMatcher);
  public toBeWithinRange = this.decorateMatcher(toBeWithinRangeMatcher);
  public toThrow = this.decorateAsyncMatcher(toThrowMatcher);
  public toBeCalled = this.decorateMatcher(toBeCalledMatcher);
  public toBeCalledUI = this.decorateMatcher(toBeCalledUIMatcher);
  public toBeCalledJS = this.decorateMatcher(toBeCalledJSMatcher);

  public toMatchSnapshots(expectedSnapshots: SingleViewSnapshot) {
    const capturedSnapshots = this._currentValue as SingleViewSnapshot;
    if (capturedSnapshots) {
      const mismatchError = compareSnapshots(expectedSnapshots, capturedSnapshots, false);
      if (mismatchError) {
        this._testCase.errors.push(mismatchError);
      }
    } else {
      this._testCase.errors.push('Could not capture snapshot');
    }
  }

  public toMatchNativeSnapshots(expectedSnapshots: SingleViewSnapshot, expectNegativeValueMismatch = false) {
    const capturedSnapshots = this._currentValue as SingleViewSnapshot;
    const mismatchError = compareSnapshots(expectedSnapshots, capturedSnapshots, true, expectNegativeValueMismatch);
    if (mismatchError) {
      this._testCase.errors.push(mismatchError);
    }
  }
}
