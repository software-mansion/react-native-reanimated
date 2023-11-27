import { useRef } from 'react';
import { TestCase, TestSuite } from './types';
import { TestComponent } from './TestComponent';
import {
  render,
  stopRecordingAnimationUpdates,
  unmockAnimationTimer,
} from './RuntimeTestsApi';
import {
  makeMutable,
  runOnJS,
  runOnUI,
  AnimatedStyle,
  StyleProps,
} from 'react-native-reanimated';

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

export type LockObject = { lock: boolean };

export const RUNTIME_TEST_ERRORS = {
  UNDEFINED_TEST_SUITE: 'Undefined test suite context',
  UNDEFINED_TEST_CASE: 'Undefined test case context',
  NO_MOCKED_TIMESTAMP:
    "Seems that you've forgot to call `mockAnimationTimer()`",
};

function logInFrame(text: string) {
  console.log(`\t╔${'═'.repeat(text.length + 2)}╗`);
  console.log(`\t║ ${text} ║`);
  console.log(`\t╚${'═'.repeat(text.length + 2)}╝`);
}

export class TestRunner {
  private _testSuites: TestSuite[] = [];
  private _currentTestSuite: TestSuite | null = null;
  private _currentTestCase: TestCase | null = null;
  private _renderHook: (component: any) => void = () => {};
  private _renderLock: LockObject = { lock: false };

  private _lockObject: LockObject = {
    lock: false,
  };

  public configure(config: { render: (component: any) => void }) {
    this._renderHook = config.render;
    return this._renderLock;
  }

  public async render(component: any) {
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
        this._currentTestCase = testCase;

        if (testSuite.beforeEach) {
          await testSuite.beforeEach();
        }
        await testCase.testCase();
        if (testCase.errors.length > 0) {
          console.log(`\t • ${testCase.name} ❌`);
          console.error(`\t${testCase.errors}`);
          console.log('\t -----------------------------------------------');
        } else {
          console.log(`\t • ${testCase.name} ✅`);
          console.log('\t -----------------------------------------------');
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
      this._currentTestSuite = null;
    }
    this._testSuites = [];
    await unmockAnimationTimer();
    await stopRecordingAnimationUpdates();
    console.log('End of tests run 🏁');
  }

  public expect(value: any) {
    this._assertTestCase(this._currentTestCase);
    this._assertTestCase(this._currentTestCase);
    const errors = this._currentTestCase?.errors;

    return {
      toBe: (expected: string) => {
        // Normalize this or we get errors like "Expected 100 received 100.0"
        if (!Number.isNaN(Number(expected))) {
          if (Number(value) !== Number(expected)) {
            errors.push(`Expected ${expected} received ${value}`);
          }
        } else if (value !== expected) {
          errors.push(`Expected ${expected} received ${value}`);
        }
      },

      toMatchSnapshot: (expected: any) => {
        if (JSON.stringify(value) !== JSON.stringify(expected)) {
          errors.push(
            `Expected ${JSON.stringify(expected)} received ${JSON.stringify(
              value
            )}`
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

  public async runOnUiSync(worklet: () => void) {
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

    await this.runOnUiSync(() => {
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
    await this.runOnUiSync(() => {
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
    await this.runOnUiSync(() => {
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
    await this.runOnUiSync(() => {
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
