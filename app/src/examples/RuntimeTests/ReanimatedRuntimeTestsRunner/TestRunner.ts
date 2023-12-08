import { useRef } from 'react';
import {
  ComparisonMode,
  LockObject,
  TestCase,
  TestSuite,
  TrackerCallCount,
} from './types';
import { TestComponent } from './TestComponent';
import {
  render,
  stopRecordingAnimationUpdates,
  unmockAnimationTimer,
} from './RuntimeTestsApi';
import {
  makeMutable,
  runOnUI,
  AnimatedStyle,
  StyleProps,
  runOnJS,
} from 'react-native-reanimated';
import { Platform } from 'react-native';
import {
  RUNTIME_TEST_ERRORS,
  color,
  defaultTestErrorLog,
  logInFrame,
} from './logMessageUtils';

declare global {
  var mockedAnimationTimestamp: number | undefined;
  var originalRequestAnimationFrame: any; //TODO type
  var originalGetAnimationTimestamp: any; //TODO type
  var originalUpdateProps: any; //TODO type
  var originalNotifyAboutProgress: any; //TODO type

  //TODO These types are already defined:
  var _getAnimationTimestamp: any;
  var __frameTimestamp: any;
  var _IS_FABRIC: boolean | undefined;
  var _updatePropsPaper: any;
  var _updatePropsFabric: any;
  var _notifyAboutProgress: any;
}

interface Operation {
  tag: number;
  name: string;
  updates: StyleProps | AnimatedStyle<any>;
}

function assertValueIsCallTracker(
  value: any
): asserts value is TrackerCallCount {
  if (!('name' in value && 'JS' in value && 'UI' in value)) {
    throw Error('Invalid value');
  }
}

let callTrackerRegistryJS: Record<string, number> = {};
const callTrackerRegistryUI = makeMutable<Record<string, number>>({});
function callTrackerJS(name: string) {
  if (!callTrackerRegistryJS[name]) {
    callTrackerRegistryJS[name] = 0;
  }
  callTrackerRegistryJS[name]++;
}

export class TestRunner {
  private _testSuites: TestSuite[] = [];
  private _currentTestSuite: TestSuite | null = null;
  private _currentTestCase: TestCase | null = null;
  private _renderHook: (component: any) => void = () => {};
  private _renderLock: LockObject = { lock: false };
  private _valueRegistry: Record<string, { value: any }> = {};
  private _wasRenderedNull: boolean = false;
  private _lockObject: LockObject = {
    lock: false,
  };

  public configure(config: { render: (component: any) => void }) {
    this._renderHook = config.render;
    return this._renderLock;
  }

  public async render(component: any) {
    if (!component && this._wasRenderedNull) {
      return;
    }
    this._wasRenderedNull = !component;
    this._renderLock.lock = true;
    this._renderHook(component);
    return this.waitForPropertyValueChange(this._renderLock, 'lock');
  }

  public describe(name: string, buildSuite: () => void) {
    this._testSuites.push({
      name,
      buildSuite,
      testCases: [],
    });
  }

  private _assertTestSuite(test: TestSuite | null): asserts test is TestSuite {
    if (!test) {
      throw new Error(RUNTIME_TEST_ERRORS.UNDEFINED_TEST_SUITE);
    }
  }

  private _assertTestCase(test: TestCase | null): asserts test is TestCase {
    if (!test) {
      throw new Error(RUNTIME_TEST_ERRORS.UNDEFINED_TEST_CASE);
    }
  }

  public test(name: string, testCase: () => void) {
    this._assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.testCases.push({
      name,
      testCase,
      componentsRefs: {},
      callsRegistry: {},
      errors: [],
    });
  }

  public useTestRef(name: string): React.MutableRefObject<any> {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ref = useRef();
    this._assertTestCase(this._currentTestCase);
    this._currentTestCase.componentsRefs[name] = ref;
    return ref;
  }

  public callTracker(name: string) {
    'worklet';
    if (_WORKLET) {
      if (!callTrackerRegistryUI.value[name]) {
        callTrackerRegistryUI.value[name] = 0;
      }
      callTrackerRegistryUI.value[name]++;
      callTrackerRegistryUI.value = { ...callTrackerRegistryUI.value };
    } else {
      callTrackerJS(name);
    }
  }

  public registerValue(name: string, value: any) {
    'worklet';
    this._valueRegistry[name] = value;
  }

  public async getRegisteredValue(name: string) {
    const jsValue = this._valueRegistry[name].value;
    const sharedValue = this._valueRegistry[name];
    const valueContainer = makeMutable<any>(null);
    await this.runOnUiBlocking(() => {
      'worklet';
      valueContainer.value = sharedValue.value;
    });
    const uiValue = valueContainer.value;
    return {
      name,
      onJS: jsValue,
      onUI: uiValue,
    };
  }

  public getTrackerCallCount(name: string): TrackerCallCount {
    return {
      name,
      JS: callTrackerRegistryJS[name] ?? 0,
      UI: callTrackerRegistryUI.value[name] ?? 0,
    };
  }

  public getTestComponent(name: string): TestComponent {
    this._assertTestCase(this._currentTestCase);
    return new TestComponent(this._currentTestCase.componentsRefs[name]);
  }

  public async runTests() {
    for (const testSuite of this._testSuites) {
      this._currentTestSuite = testSuite;

      logInFrame(`Running test suite: ${testSuite.name}`);

      testSuite.buildSuite();
      if (testSuite.beforeAll) {
        await testSuite.beforeAll();
      }

      for (const testCase of testSuite.testCases) {
        callTrackerRegistryUI.value = {};
        callTrackerRegistryJS = {};
        this._currentTestCase = testCase;

        if (testSuite.beforeEach) {
          await testSuite.beforeEach();
        }
        await testCase.testCase();
        if (testCase.errors.length > 0) {
          console.log(`\t❌ ${testCase.name} `);
          for (const error of testCase.errors) {
            console.log(`\t\t${error}`);
          }
        } else {
          console.log(`\t✅ ${testCase.name}`);
        }
        if (testSuite.afterEach) {
          await testSuite.afterEach();
        }
        this._currentTestCase = null;
        await render(null);
      }
      if (testSuite.afterAll) {
        await testSuite.afterAll();
      }
      console.log('\n\n');
      this._currentTestSuite = null;
    }
    this._testSuites = [];
    await unmockAnimationTimer();
    await stopRecordingAnimationUpdates();
    console.log('End of tests run 🏁');
  }

  public expect(value: TrackerCallCount | string | Array<unknown>) {
    this._assertTestCase(this._currentTestCase);
    this._assertTestCase(this._currentTestCase);
    const errors = this._currentTestCase?.errors;

    return {
      toBe: (expected: any, comparisonMode: ComparisonMode) => {
        switch (comparisonMode) {
          case ComparisonMode.STRING: {
            if (value !== expected) {
              errors.push(defaultTestErrorLog(expected, value));
            }
            break;
          }
          case ComparisonMode.NUMBER: {
            if (isNaN(Number(value)) || Number(value) !== Number(expected)) {
              errors.push(defaultTestErrorLog(expected, value));
            }
            break;
          }
          case ComparisonMode.COLOR: {
            const colorRegex = new RegExp('^#?([a-f0-9]{6}|[a-f0-9]{3})$');
            if (!colorRegex.test(expected)) {
              throw Error(
                `Invalid color format "${expected}", please use lowercase hex color (like #123abc) `
              );
            }

            if (typeof value !== 'string' || value !== expected) {
              errors.push(defaultTestErrorLog(expected, value));
            }
            break;
          }
          case ComparisonMode.DISTANCE: {
            const valueAsNumber = Number(value);
            if (Platform.OS === 'ios') {
              if (isNaN(valueAsNumber) || valueAsNumber !== Number(expected)) {
                errors.push(defaultTestErrorLog(expected, value));
              }
            } else {
              if (
                isNaN(valueAsNumber) ||
                Math.abs(valueAsNumber - Number(expected)) > 1
              ) {
                errors.push(
                  `Expected ${color(
                    `${expected}±1`,
                    'green'
                  )} received ${value}`
                );
              }
            }
          }
        }
      },
      toMatchSnapshot: (expected: any) => {
        if (Array.isArray(value) && Array.isArray(value)) {
          let errorString = '';
          value.forEach((val, idx) => {
            const expectedVal = expected[idx];
            if (val !== expectedVal) {
              errorString += `\t At index ${idx}\texpected\t${color(
                `${JSON.stringify(expectedVal)}`,
                'yellow'
              )}\treceived\t${color(`${JSON.stringify(val)}`, 'yellow')}\n`;
            }
          });
          if (errorString !== '') {
            errors.push('Snapshot mismatch: \n' + errorString);
          }
        } else if (JSON.stringify(value) !== JSON.stringify(expected)) {
          errors.push(
            `Expected ${JSON.stringify(expected)} received ${JSON.stringify(
              value
            )}`
          );
        }
      },
      toBeCalled: (times: number = 1) => {
        assertValueIsCallTracker(value);
        const callsCount = value.UI + value.JS;
        if (callsCount !== times) {
          errors.push(
            `Expected ${color(value.name, 'green')} to be called ${color(
              times,
              'green'
            )} times, but was called ${color(callsCount, 'green')} times`
          );
        }
      },
      toBeCalledUI: (times: number) => {
        assertValueIsCallTracker(value);
        if (value.UI !== times) {
          errors.push(
            `Expected ${color(value.name, 'green')} to be called ${color(
              times,
              'green'
            )} times on ${color('UI thread', 'cyan')}, but was called ${color(
              value.UI,
              'green'
            )} times`
          );
        }
      },
      toBeCalledJS: (times: number) => {
        assertValueIsCallTracker(value);
        if (value.JS !== times) {
          errors.push(
            `Expected ${color(value.name, 'green')} to be called ${color(
              times,
              'green'
            )} times on ${color('JS thread', 'cyan')}, but was called ${color(
              value.JS,
              'green'
            )} times`
          );
        }
      },
    };
  }

  public beforeAll(job: () => void) {
    this._assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.beforeAll = job;
  }

  public afterAll(job: () => void) {
    this._assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.afterAll = job;
  }

  public beforeEach(job: () => void) {
    this._assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.beforeEach = job;
  }

  public afterEach(job: () => void) {
    this._assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.afterEach = job;
  }

  private waitForPropertyValueChange(
    targetObject: LockObject,
    targetProperty: 'lock',
    initialValue = true
  ) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (targetObject[targetProperty] !== initialValue) {
          clearInterval(interval);
          resolve(targetObject[targetProperty]);
        }
      }, 10);
    });
  }

  public async runOnUiBlocking(worklet: () => void) {
    const unlock = () => (this._lockObject.lock = false);

    this._lockObject.lock = true;
    runOnUI(() => {
      'worklet';
      worklet();
      runOnJS(unlock)();
    })();
    await this.waitForPropertyValueChange(this._lockObject, 'lock', true);
  }

  public async recordAnimationUpdates(mergeOperations = true) {
    const updates = makeMutable<Array<any> | null>(null);

    await this.runOnUiBlocking(() => {
      'worklet';
      const originalUpdateProps = global._IS_FABRIC
        ? global._updatePropsFabric
        : global._updatePropsPaper;
      global.originalUpdateProps = originalUpdateProps;

      const mockedUpdateProps = (operations: Operation[]) => {
        if (updates.value === null) {
          updates.value = [];
        }

        if (mergeOperations) {
          operations.forEach((operation) => {
            updates?.value?.push(operation.updates);
          });
          updates.value = [...updates.value];
        } else {
          for (const operation of operations) {
            if (updates.value[operation.tag] === undefined) {
              updates.value[operation.tag] = [];
            }
            updates.value[operation.tag].push(updates.value[operation.tag]);
          }
          updates.value = operations;
        }
        originalUpdateProps(operations);
      };

      if (global._IS_FABRIC) {
        global._updatePropsFabric = mockedUpdateProps;
      } else {
        global._updatePropsPaper = mockedUpdateProps;
      }

      const originalNotifyAboutProgress = global._notifyAboutProgress;
      global.originalNotifyAboutProgress = originalNotifyAboutProgress;
      global._notifyAboutProgress = (
        tag: number,
        value: Record<string, unknown>,
        isSharedTransition: boolean
      ) => {
        if (updates.value === null) {
          updates.value = [];
        }
        if (mergeOperations) {
          updates.value.push({ ...value });
          updates.value = [...updates.value];
        } else {
          if (updates.value[tag] === undefined) {
            updates.value[tag] = [];
          }
          updates.value[tag].push(value);
          updates.value = { ...updates.value };
        }
        originalNotifyAboutProgress(tag, value, isSharedTransition);
      };
    });
    return updates;
  }

  public async stopRecordingAnimationUpdates() {
    await this.runOnUiBlocking(() => {
      'worklet';
      if (global.originalUpdateProps) {
        if (global._IS_FABRIC) {
          global._updatePropsFabric = global.originalUpdateProps;
        } else {
          global._updatePropsPaper = global.originalUpdateProps;
        }
        global.originalUpdateProps = undefined;
      }
      if (global.originalNotifyAboutProgress) {
        global._notifyAboutProgress = global.originalNotifyAboutProgress;
        global.originalNotifyAboutProgress = undefined;
      }
    });
  }

  async mockAnimationTimer() {
    await this.runOnUiBlocking(() => {
      'worklet';
      global.mockedAnimationTimestamp = 0;
      global.originalGetAnimationTimestamp = global._getAnimationTimestamp;
      global._getAnimationTimestamp = () => {
        const currentTimestamp = global.mockedAnimationTimestamp;
        global.__frameTimestamp = currentTimestamp;
        if (!global?.mockedAnimationTimestamp) {
          global.mockedAnimationTimestamp = 0;
        }
        global.mockedAnimationTimestamp += 16;
        return currentTimestamp;
      };
      let originalRequestAnimationFrame = global.requestAnimationFrame;
      global.originalRequestAnimationFrame = originalRequestAnimationFrame;
      (global as any).requestAnimationFrame = (callback: Function) => {
        originalRequestAnimationFrame(() => {
          callback(global._getAnimationTimestamp());
        });
      };
    });
  }

  async unmockAnimationTimer() {
    await this.runOnUiBlocking(() => {
      'worklet';
      if (global.originalGetAnimationTimestamp) {
        global._getAnimationTimestamp = global.originalGetAnimationTimestamp;
        global.originalGetAnimationTimestamp = undefined;
      }
      if (global.originalRequestAnimationFrame) {
        global.requestAnimationFrame = global.originalRequestAnimationFrame;
        global.originalRequestAnimationFrame = undefined;
      }
      if (global.mockedAnimationTimestamp) {
        global.mockedAnimationTimestamp = undefined;
      }
    });
  }
}
