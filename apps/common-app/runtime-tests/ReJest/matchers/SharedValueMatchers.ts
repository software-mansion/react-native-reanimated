import type { ValueRegistry } from '../TestRunner/ValueRegistry';
import type { TestCase, TestValue } from '../types';
import type { ComparisonMode } from '../types';
import { Matchers } from './Matchers';

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
}
