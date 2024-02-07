import { color, defaultTestErrorLog } from './logMessageUtils';
import { ComparisonMode, TestCase, TestValue, TrackerCallCount } from './types';

const ERROR_DISTANCE = 0.5;

const COMPARATORS: {
  [Key: string]: (expected: TestValue, value: TestValue) => Boolean;
} = {
  [ComparisonMode.STRING]: (expected, value) => {
    return value === expected;
  },
  [ComparisonMode.NUMBER]: (expected, value) => {
    const bothAreNumbers =
      typeof value === 'number' && typeof expected === 'number';
    const bothAreNaN = bothAreNumbers && isNaN(value) && isNaN(expected);
    return bothAreNaN || value === expected;
  },
  [ComparisonMode.COLOR]: (expected, value) => {
    const colorRegex = new RegExp('^#?([a-f0-9]{6}|[a-f0-9]{3})$');
    if (!colorRegex.test(expected as string)) {
      throw Error(
        `Invalid color format "${expected}", please use lowercase hex color (like #123abc)`
      );
    }
    return typeof value === 'string' && value === expected;
  },
  [ComparisonMode.DISTANCE]: (expected, value) => {
    const valueAsNumber = Number(value);
    return (
      !isNaN(valueAsNumber) &&
      Math.abs(valueAsNumber - Number(expected)) < ERROR_DISTANCE
    );
  },
};

export class Matchers {
  constructor(private currentValue: TestValue, private testCase: TestCase) {}

  private assertValueIsCallTracker(
    value: TrackerCallCount | TestValue
  ): asserts value is TrackerCallCount {
    if (
      typeof value !== 'object' ||
      !('name' in value && 'onJS' in value && 'onUI' in value)
    ) {
      throw Error('Invalid value');
    }
  }

  public toBe(
    expectedValue: TestValue,
    comparisonMode = ComparisonMode.DISTANCE
  ) {
    const isEqual = COMPARATORS[comparisonMode];
    if (!isEqual(expectedValue, this.currentValue)) {
      this.testCase.errors.push(
        defaultTestErrorLog(expectedValue, this.currentValue, comparisonMode)
      );
    }
  }

  public toBeCalled(times = 1) {
    this.assertValueIsCallTracker(this.currentValue);
    const callsCount = this.currentValue.onUI + this.currentValue.onJS;
    if (callsCount !== times) {
      const name = color(this.currentValue.name, 'green');
      const expected = color(times, 'green');
      const received = color(callsCount, 'red');
      this.testCase.errors.push(
        `Expected ${name} to be called ${expected} times, but was called ${received} times`
      );
    }
  }

  public toBeCalledUI(times = 1) {
    this.assertValueIsCallTracker(this.currentValue);
    if (this.currentValue.onUI !== times) {
      const name = color(this.currentValue.name, 'green');
      const threadName = color('UI thread', 'cyan');
      const expected = color(times, 'green');
      const received = color(this.currentValue.onUI, 'red');
      this.testCase.errors.push(
        `Expected ${name} to be called ${expected} times on ${threadName}, but was called ${received} times`
      );
    }
  }

  public toBeCalledJS(times = 1) {
    this.assertValueIsCallTracker(this.currentValue);
    if (this.currentValue.onJS !== times) {
      const name = color(this.currentValue.name, 'green');
      const threadName = color('UI thread', 'cyan');
      const expected = color(times, 'green');
      const received = color(this.currentValue.onUI, 'red');
      this.testCase.errors.push(
        `Expected ${name} to be called ${expected} times on ${threadName}, but was called ${received} times`
      );
    }
  }

  public toMatchSnapshot(expectedValue: TestValue) {
    if (Array.isArray(expectedValue)) {
      let errorString = '';
      (this.currentValue as Array<unknown>).forEach(
        (val: unknown, idx: number) => {
          const expectedVal = expectedValue[idx];
          if (JSON.stringify(expectedVal) !== JSON.stringify(val)) {
            const expected = color(`${JSON.stringify(expectedVal)}`, 'green');
            const received = color(`${JSON.stringify(val)}`, 'red');
            errorString += `\tAt index ${idx}:\n\t\texpected: ${expected}\n\t\treceived: ${received}\n`;
          }
        }
      );
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
    /* 
      The TestRunner can collect two types of snapshots:
      - JS snapshots: animation updates sent via `_updateProps`
      - Native snapshots: snapshots obtained from the native side via `getViewProp`
      Updates applied through `_updateProps` are not synchronously applied to the native side. Instead, they are batched and applied at the end of each frame. Therefore, it is not allowed to take a native snapshot immediately after the `_updateProps` call. To address this issue, we need to wait for the next frame before capturing the native snapshot. That's why native snapshots are one frame behind JS snapshots. To account for this delay, one additional native snapshot is taken during the execution of the `toMatchNativeSnapshots` function.
    */
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
          const expected = color(jsValue as string, 'green');
          const received = color(nativeValue as string, 'red');
          errorString += `\tAt index ${i}, value of prop ${key}:\n\t\texpected: ${expected}\n\t\treceived: ${received}\n`;
        }
      }
    }
    if (errorString !== '') {
      this.testCase.errors.push('Native snapshot mismatch: \n' + errorString);
    }
  }
}
