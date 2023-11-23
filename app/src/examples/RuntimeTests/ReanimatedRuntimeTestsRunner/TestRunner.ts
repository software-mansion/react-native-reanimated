import { useRef } from 'react';
import { TestCase, TestSuite } from './types';
import { TestComponent } from './TestComponent';
import {
  render,
  stopRecordingAnimationUpdates,
  unmockAnimationTimer,
} from './RuntimeTestsApi';
import { makeMutable, runOnJS, runOnUI } from 'react-native-reanimated';

export type LockObject = { lock: boolean };

const Messages = {
  UNDEFINED_TEST_SUITE: 'Undefined test suite context',
  UNDEFINED_TEST_CASE: 'Undefined test case context',
};

export class TestRunner {
  private _testSuites: TestSuite[] = [];
  private _currentTestSuite: TestSuite | null = null;
  private _currentTestCase: TestCase | null = null;
  private _renderHook: (component: any) => void = () => {};
  private _renderLock: LockObject = { lock: false };

  private lockObject: LockObject = {
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

  private assertTestSuite(test: TestSuite | null): asserts test is TestSuite {
    if (!test) {
      throw new Error(Messages.UNDEFINED_TEST_SUITE);
    }
  }
  private assertTestCase(test: TestCase | null): asserts test is TestCase {
    if (!test) {
      throw new Error(Messages.UNDEFINED_TEST_CASE);
    }
  }

  public test(name: string, testCase: () => void) {
    this.assertTestSuite(this._currentTestSuite);
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
    this.assertTestCase(this._currentTestCase);
    this._currentTestCase.componentsRefs[name] = ref;
    return ref;
  }

  public getTestComponent(name: string): TestComponent {
    if (!this._currentTestCase) {
      throw new Error('Undefined test case context');
    }
    return new TestComponent(this._currentTestCase.componentsRefs[name]);
  }

  public async runTests() {
    for (const testSuite of this._testSuites) {
      this._currentTestSuite = testSuite;
      console.log(`+ Running test suite: ${testSuite.name}`);
      console.log(testSuite);
      testSuite.buildSuite();
      if (testSuite.beforeAll) {
        await testSuite.beforeAll();
      }
      for (const testCase of testSuite.testCases) {
        this._currentTestCase = testCase;
        console.log(`\t - Running test case: ${testCase.name}`);
        if (testSuite.beforeEach) {
          await testSuite.beforeEach();
        }
        await testCase.testCase();
        if (testCase.errors.length > 0) {
          console.error(testCase.errors);
          console.log('\t -----------------------------------------------');
        } else {
          console.log('\t ✅ OK');
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
    this.assertTestCase(this._currentTestCase);
    const errors = this._currentTestCase?.errors;
    return {
      toBe: (expected: any) => {
        if (value !== expected) {
          errors.push(`Expected ${value} received ${expected}`);
        }
      },
      toMatchSnapshot: (expected: any) => {
        if (JSON.stringify(value) !== JSON.stringify(expected)) {
          errors.push(
            `Expected ${JSON.stringify(value)} received ${JSON.stringify(
              expected
            )}`
          );
        }
      },
    };
  }

  public beforeAll(job: () => void) {
    this.assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.beforeAll = job;
  }

  public afterAll(job: () => void) {
    this.assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.afterAll = job;
  }

  public beforeEach(job: () => void) {
    this.assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.beforeEach = job;
  }

  public afterEach(job: () => void) {
    this.assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.afterEach = job;
  }

  private waitForPropertyValueChange(
    targetObject,
    targetProperty,
    initialValue = true
  ) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (targetObject[targetProperty] != initialValue) {
          clearInterval(interval);
          resolve(targetObject[targetProperty]);
        }
      }, 10);
    });
  }

  public async runOnUiSync(worklet: () => void) {
    const unlock = () => (this.lockObject.lock = false);

    this.lockObject.lock = true;
    runOnUI(() => {
      'worklet';
      worklet();
      runOnJS(unlock)();
    })();
    await this.waitForPropertyValueChange(this.lockObject, 'lock', true);
  }

  public async recordAnimationUpdates(mergeOperations = true) {
    const updates = makeMutable<any>(null);

    await this.runOnUiSync(() => {
      'worklet';
      const originalUpdateProps = global._IS_FABRIC
        ? global._updatePropsFabric
        : global._updatePropsPaper;
      global.originalUpdateProps = originalUpdateProps;

      const mockedUpdateProps = mergeOperations
        ? (operations) => {
            if (updates.value == null) {
              updates.value = [];
            }
            const newUpdates: any = [];
            for (const operation of operations) {
              newUpdates.push(operation.updates);
            }
            for (const newUpdate of newUpdates) {
              updates.value.push(newUpdate);
            }
            updates.value = [...updates.value];
            originalUpdateProps(operations);
          }
        : (operations) => {
            if (updates.value == null) {
              updates.value = {};
            }
            for (const operation of operations) {
              if (updates.value[operation.tag] == undefined) {
                updates.value[operation.tag] = [];
              }
              updates.value[operation.tag].push(updates.value[operation.tag]);
            }
            updates.value = operations;
            originalUpdateProps(operations);
          };

      if (global._IS_FABRIC) {
        global._updatePropsFabric = mockedUpdateProps;
      } else {
        global._updatePropsPaper = mockedUpdateProps;
      }

      const originalNotifyAboutProgress = global._notifyAboutProgress;
      global.originalNotifyAboutProgress = originalNotifyAboutProgress;
      global._notifyAboutProgress = mergeOperations
        ? (tag, value, isSharedTransition) => {
            if (updates.value == null) {
              updates.value = [];
            }
            updates.value.push({ ...value });
            updates.value = [...updates.value];
            originalNotifyAboutProgress(tag, value, isSharedTransition);
          }
        : (tag, value, isSharedTransition) => {
            if (updates.value == null) {
              updates.value = {};
            }
            if (updates.value[tag] == undefined) {
              updates.value[tag] = [];
            }
            updates.value[tag].push(value);
            updates.value = { ...updates.value };
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
        global.mockedAnimationTimestamp += 16;
        return currentTimestamp;
      };
      let originalRequestAnimationFrame = global.requestAnimationFrame;
      global.originalRequestAnimationFrame = originalRequestAnimationFrame;
      (global as any).requestAnimationFrame = (callback) => {
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
