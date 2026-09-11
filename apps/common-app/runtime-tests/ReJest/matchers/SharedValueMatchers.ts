import type { ValueRegistry } from '../TestRunner/ValueRegistry';
import type { TestCase, TestValue } from '../types';
import type { ComparisonMode } from '../types';
import { Matchers } from './Matchers';
import { toBeMatcher } from './rawMatchers';
import { waitFor } from '../utils/waitFor';

class SharedValueSideMatchers {
  constructor(
    private _read: () => TestValue | Promise<TestValue>,
    private _testCase: TestCase
  ) {}

  public async toBe(expected: TestValue, comparisonMode?: ComparisonMode) {
    const value = await this._read();
    new Matchers(value, this._testCase).toBe(expected, comparisonMode);
  }
}

export class SharedValueMatchers {
  constructor(
    private _valueRegistry: ValueRegistry,
    private _name: string,
    private _testCase: TestCase
  ) {}

  public get onJS() {
    return new SharedValueSideMatchers(
      () => this._valueRegistry.getOnJS(this._name),
      this._testCase
    );
  }

  public get onUI() {
    return new SharedValueSideMatchers(
      () => this._valueRegistry.getOnUI(this._name),
      this._testCase
    );
  }

  public async toBe(expected: TestValue, comparisonMode?: ComparisonMode) {
    await this.onJS.toBe(expected, comparisonMode);
    await this.onUI.toBe(expected, comparisonMode);
  }

  public async toConverge(
    expected: TestValue,
    comparisonMode?: ComparisonMode,
    timeout = 1000
  ) {
    let observed = this._valueRegistry.peekOnJS(this._name);

    try {
      await waitFor(
        () => {
          observed = this._valueRegistry.peekOnJS(this._name);
          return toBeMatcher(observed, false, expected, comparisonMode).pass;
        },
        {
          description: `'${this._name}' to converge on the JS runtime`,
          timeout,
          describeState: () => String(observed),
        }
      );
    } catch {
      new Matchers(observed, this._testCase).toBe(expected, comparisonMode);
    }
  }
}
