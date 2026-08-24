import type { TestCase, TestValue } from '../types';
import { DEFAULT_TIMEOUT_MS, waitFor } from '../utils/waitFor';
import type { Matcher, SyncMatcherArguments } from './rawMatchers';
import {
  toBeCalledJSMatcher,
  toBeCalledMatcher,
  toBeCalledUIMatcher,
  toBeMatcher,
  toBeWithinRangeMatcher,
  toIncludeMatcher,
} from './rawMatchers';

const POLL_INTERVAL_MS = 32;

export type ValueGetter = () => TestValue | Promise<TestValue>;

export class EventualMatchers {
  private _negation = false;

  constructor(
    private _getValue: ValueGetter,
    private _testCase: TestCase,
    private _timeout = DEFAULT_TIMEOUT_MS
  ) {}

  get not() {
    this._negation = true;
    return this;
  }

  private decorateMatcher<MatcherArgs extends SyncMatcherArguments>(
    matcher: Matcher<MatcherArgs>,
    matcherName: string
  ) {
    return async (...args: MatcherArgs) => {
      let lastMessage = `${matcherName} was never evaluated`;

      try {
        await waitFor(
          async () => {
            const currentValue = await this._getValue();
            const { pass, message } = matcher(
              currentValue,
              this._negation,
              ...args
            );
            lastMessage = message;
            return pass !== this._negation;
          },
          {
            description: `\`${matcherName}\` to be satisfied`,
            timeout: this._timeout,
            interval: POLL_INTERVAL_MS,
          }
        );
      } catch {
        this._testCase.errors.push(lastMessage);
      }
    };
  }

  public toBe = this.decorateMatcher(toBeMatcher, 'toBe');
  public toBeWithinRange = this.decorateMatcher(
    toBeWithinRangeMatcher,
    'toBeWithinRange'
  );
  public toInclude = this.decorateMatcher(toIncludeMatcher, 'toInclude');
  public toBeCalled = this.decorateMatcher(toBeCalledMatcher, 'toBeCalled');
  public toBeCalledUI = this.decorateMatcher(
    toBeCalledUIMatcher,
    'toBeCalledUI'
  );
  public toBeCalledJS = this.decorateMatcher(
    toBeCalledJSMatcher,
    'toBeCalledJS'
  );
}
