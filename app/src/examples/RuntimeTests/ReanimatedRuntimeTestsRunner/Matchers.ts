import { Platform } from 'react-native';
import { color, defaultTestErrorLog } from './logMessageUtils';
import { ComparisonMode, TestCase, TrackerCallCount } from './types';

type TestValue =
  | TrackerCallCount
  | string
  | Array<unknown>
  | number
  | bigint
  | Record<string, unknown>;

export class Matchers {
  constructor(private currentValue: TestValue, private testCase: TestCase) {}

  private assertValueIsCallTracker(
    value: any
  ): asserts value is TrackerCallCount {
    if (!('name' in value && 'JS' in value && 'UI' in value)) {
      throw Error('Invalid value');
    }
  }

  public toBe(
    expectedValue: TestValue,
    comparisonMode = ComparisonMode.DISTANCE
  ) {
    const CONDITIONS: { [Key: string]: (e: any, v: any) => Boolean } = {
      [ComparisonMode.STRING]: (expected, value) => {
        return value !== expected;
      },
      [ComparisonMode.NUMBER]: (e, v) => {
        return isNaN(Number(v)) ? !isNaN(e) : Number(v) !== Number(e);
      },
      [ComparisonMode.COLOR]: (e, v) => {
        const colorRegex = new RegExp('^#?([a-f0-9]{6}|[a-f0-9]{3})$');
        if (!colorRegex.test(expectedValue as string)) {
          throw Error(
            `Invalid color format "${e}", please use lowercase hex color (like #123abc) `
          );
        }
        return typeof v !== 'string' || v !== e;
      },
      [ComparisonMode.DISTANCE]: () => {
        const valueAsNumber = Number(this.currentValue);
        if (Platform.OS === 'ios') {
          return (
            isNaN(valueAsNumber) || valueAsNumber !== Number(expectedValue)
          );
        } else {
          return (
            isNaN(valueAsNumber) ||
            Math.abs(valueAsNumber - Number(expectedValue)) > 1
          );
        }
      },
    };

    let testFailed = CONDITIONS[comparisonMode](
      expectedValue,
      this.currentValue
    );
    if (testFailed) {
      this.testCase.errors.push(
        defaultTestErrorLog(expectedValue, this.currentValue, comparisonMode)
      );
    }
  }

  public toBeCalled(times: number = 1) {
    this.assertValueIsCallTracker(this.currentValue);
    const callsCount = this.currentValue.UI + this.currentValue.JS;
    if (callsCount !== times) {
      const name = color(this.currentValue.name, 'green');
      const expected = color(times, 'green');
      const received = color(callsCount, 'red');
      this.testCase.errors.push(
        `Expected ${name} to be called ${expected} times, but was called ${received} times`
      );
    }
  }

  public toBeCalledUI(times: number) {
    this.assertValueIsCallTracker(this.currentValue);
    if (this.currentValue.UI !== times) {
      const name = color(this.currentValue.name, 'green');
      const threadName = color('UI thread', 'cyan');
      const expected = color(times, 'green');
      const received = color(this.currentValue.UI, 'red');
      this.testCase.errors.push(
        `Expected ${name} to be called ${expected} times on ${threadName}, but was called ${received} times`
      );
    }
  }

  public toBeCalledJS(times: number) {
    this.assertValueIsCallTracker(this.currentValue);
    if (this.currentValue.JS !== times) {
      const name = color(this.currentValue.name, 'green');
      const threadName = color('UI thread', 'cyan');
      const expected = color(times, 'green');
      const received = color(this.currentValue.UI, 'red');
      this.testCase.errors.push(
        `Expected ${name} to be called ${expected} times on ${threadName}, but was called ${received} times`
      );
    }
  }

  public toMatchSnapshot(expectedValue: TestValue) {
    if (Array.isArray(expectedValue) && Array.isArray(expectedValue)) {
      let errorString = '';
      (this.currentValue as any).forEach((val: any, idx: number) => {
        const expectedVal = expectedValue[idx];
        if (JSON.stringify(expectedVal) !== JSON.stringify(val)) {
          const expected = color(`${JSON.stringify(expectedVal)}`, 'green');
          const received = color(`${JSON.stringify(val)}`, 'red');
          errorString += `\tAt index ${idx}:\n\t\texpected: ${expected}\n\t\treceived: ${received}\n`;
        }
      });
      if (errorString !== '') {
        this.testCase.errors.push('Snapshot mismatch: \n' + errorString);
      }
    } else if (
      JSON.stringify(this.currentValue) !== JSON.stringify(expectedValue)
    ) {
      this.testCase.errors.push(
        `Expected ${JSON.stringify(expectedValue)} received ${JSON.stringify(
          this.currentValue
        )}`
      );
    }
  }

  public toMatchNativeSnapshots(
    nativeSnapshots: Array<Record<string, unknown>>
  ) {
    let errorString = '';
    const jsUpdates = this.currentValue as Array<Record<string, unknown>>;
    for (let i = 0; i < jsUpdates.length; i++) {
      const jsUpdate = jsUpdates[i];
      const nativeUpdate = nativeSnapshots[i + 1];
      const keys = Object.keys(jsUpdate);
      for (const key of keys) {
        const jsValue = jsUpdate[key];
        const nativeValue = nativeUpdate[key];
        let detectedMismatch = false;
        if (typeof jsValue === 'number') {
          if (
            Math.round(jsValue) !== Math.round(nativeValue as number) &&
            Math.abs(jsValue - (nativeValue as number)) > 1
          ) {
            detectedMismatch = true;
          }
        } else {
          if (jsValue !== nativeValue) {
            detectedMismatch = true;
          }
        }
        if (detectedMismatch) {
          const expected = color(jsValue, 'green');
          const received = color(nativeValue, 'red');
          errorString += `\tAt index ${i}, value of prop ${key}:\n\t\texpected: ${expected}\n\t\treceived: ${received}\n`;
        }
      }
    }
    if (errorString !== '') {
      this.testCase.errors.push('Native snapshot mismatch: \n' + errorString);
    }
  }
}
