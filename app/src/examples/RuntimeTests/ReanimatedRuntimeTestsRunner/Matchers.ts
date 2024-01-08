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

  public toBe(expectedValue: TestValue, comparisonMode: ComparisonMode) {
    const CONDITIONS: { [Key: string]: (e: any, v: any) => Boolean } = {
      [ComparisonMode.STRING]: (expected, value) => {
        return value !== expected;
      },
      [ComparisonMode.NUMBER]: (e, v) => {
        return isNaN(Number(v)) ? !isNaN(e) : Number(v) !== Number(e);
      },
      [ComparisonMode.COLOR]: (e, v) => {
        const colorRegex = new RegExp('^#?([a-f0-9]{6}|[a-f0-9]{3})$');
        console.log('COLOR', v);
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

  public toMatchSnapshot(expectedValue: TestValue) {
    if (Array.isArray(expectedValue) && Array.isArray(expectedValue)) {
      let errorString = '';
      (this.currentValue as any).forEach((val: any, idx: number) => {
        const expectedVal = expectedValue[idx];
        if (JSON.stringify(expectedVal) !== JSON.stringify(val)) {
          errorString += `\t At index ${idx}\texpected\t${color(
            `${JSON.stringify(expectedVal)}`,
            'yellow'
          )}\treceived\t${color(`${JSON.stringify(val)}`, 'yellow')}\n`;
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

  public toBeCalled(times: number = 1) {
    this.assertValueIsCallTracker(this.currentValue);
    const callsCount = this.currentValue.UI + this.currentValue.JS;
    if (callsCount !== times) {
      this.testCase.errors.push(
        `Expected ${color(
          this.currentValue.name,
          'green'
        )} to be called ${color(times, 'green')} times, but was called ${color(
          callsCount,
          'green'
        )} times`
      );
    }
  }

  public toBeCalledUI(times: number) {
    this.assertValueIsCallTracker(this.currentValue);
    if (this.currentValue.UI !== times) {
      this.testCase.errors.push(
        `Expected ${color(
          this.currentValue.name,
          'green'
        )} to be called ${color(times, 'green')} times on ${color(
          'UI thread',
          'cyan'
        )}, but was called ${color(this.currentValue.UI, 'green')} times`
      );
    }
  }

  public toBeCalledJS(times: number) {
    this.assertValueIsCallTracker(this.currentValue);
    if (this.currentValue.JS !== times) {
      this.testCase.errors.push(
        `Expected ${color(
          this.currentValue.name,
          'green'
        )} to be called ${color(times, 'green')} times on ${color(
          'JS thread',
          'cyan'
        )}, but was called ${color(this.currentValue.JS, 'green')} times`
      );
    }
  }

  public toMatchNativeSnapshots(
    nativeSnapshots: Array<Record<string, unknown>>
  ) {
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
          this.testCase.errors.push(
            `Expected ${color(jsValue, 'green')} to match ${color(
              nativeValue,
              'green'
            )}`
          );
        }
      }
    }
  }
}
