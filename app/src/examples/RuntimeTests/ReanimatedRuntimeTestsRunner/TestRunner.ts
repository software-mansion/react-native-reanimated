import { Component, MutableRefObject, ReactElement, useRef } from 'react';
import type {
  LockObject,
  Operation,
  SharedValueSnapshot,
  TestCase,
  TestConfiguration,
  TestSuite,
  TestSummary,
  TestValue,
  TrackerCallCount,
} from './types';
import { TestComponent } from './TestComponent';
import { render, stopRecordingAnimationUpdates, unmockAnimationTimer } from './RuntimeTestsApi';
import { makeMutable, runOnUI, runOnJS, SharedValue } from 'react-native-reanimated';
import { color, formatString, indentNestingLevel } from './stringFormatUtils';
import { createUpdatesContainer } from './UpdatesContainer';
import { Matchers } from './Matchers';
import { assertMockedAnimationTimestamp, assertTestCase, assertTestSuite } from './Asserts';

let callTrackerRegistryJS: Record<string, number> = {};
const callTrackerRegistryUI = makeMutable<Record<string, number>>({});
function callTrackerJS(name: string) {
  if (!callTrackerRegistryJS[name]) {
    callTrackerRegistryJS[name] = 0;
  }
  callTrackerRegistryJS[name]++;
}

const notificationRegistry: Record<string, boolean> = {};
function notifyJS(name: string) {
  notificationRegistry[name] = true;
}

export class TestRunner {
  private _testSuites: TestSuite[] = [];
  private _currentTestSuite: TestSuite | null = null;
  private _currentTestCase: TestCase | null = null;
  private _renderHook: (component: ReactElement<Component> | null) => void = () => {};
  private _renderLock: LockObject = { lock: false };
  private _valueRegistry: Record<string, SharedValue> = {};
  private _wasRenderedNull: boolean = false;
  private _nestingLevel = -1;
  private _threadLock: LockObject = {
    lock: false,
  };

  public notify(name: string) {
    'worklet';
    if (_WORKLET) {
      runOnJS(notifyJS)(name);
    } else {
      notifyJS(name);
    }
  }

  public async waitForNotify(name: string) {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (notificationRegistry[name]) {
          clearInterval(interval);
          resolve(true);
        }
      }, 10);
    });
  }

  public configure(config: TestConfiguration) {
    this._renderHook = config.render;
    return this._renderLock;
  }

  public async render(component: ReactElement<Component> | null) {
    if (!component && this._wasRenderedNull) {
      return;
    }
    this._wasRenderedNull = !component;
    this._renderLock.lock = true;
    this._renderHook(component);
    return this.waitForPropertyValueChange(this._renderLock, 'lock');
  }

  public async clearRenderOutput() {
    return await this.render(null);
  }

  public describe(name: string, buildSuite: () => void) {
    this._testSuites.push({
      name,
      buildSuite,
      testCases: [],
      nestingLevel: this._nestingLevel + 1,
    });
  }

  public test(name: string, run: () => void) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.testCases.push({
      name,
      run,
      componentsRefs: {},
      callsRegistry: {},
      errors: [],
    });
  }

  public testEach<T>(examples: Array<T>) {
    return (name: string, testCase: (example: T) => void) => {
      examples.forEach((example, index) => {
        const currentTestCase = async () => {
          await testCase(example);
        };
        this.test(formatString(name, example, index), currentTestCase);
      });
    };
  }

  public useTestRef(name: string): MutableRefObject<Component | null> {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ref = useRef(null);
    assertTestCase(this._currentTestCase);
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

  public registerValue(name: string, value: SharedValue) {
    'worklet';
    this._valueRegistry[name] = value;
  }

  public async getRegisteredValue(name: string): Promise<SharedValueSnapshot> {
    const jsValue = this._valueRegistry[name].value;
    const sharedValue = this._valueRegistry[name];
    const valueContainer = makeMutable<unknown>(null);
    await this.runOnUIBlocking(() => {
      'worklet';
      valueContainer.value = sharedValue.value;
    });
    const uiValue = valueContainer.value;
    return {
      name,
      onJS: jsValue as TestValue,
      onUI: uiValue as TestValue,
    };
  }

  public getTrackerCallCount(name: string): TrackerCallCount {
    return {
      name,
      onJS: callTrackerRegistryJS[name] ?? 0,
      onUI: callTrackerRegistryUI.value[name] ?? 0,
    };
  }

  public getTestComponent(name: string): TestComponent {
    assertTestCase(this._currentTestCase);
    const componentRef = this._currentTestCase.componentsRefs[name];
    return new TestComponent(componentRef);
  }

  public async runTests() {
    const summary: TestSummary = {
      passed: 0,
      failed: 0,
      failedTests: [] as Array<string>,
      startTime: Date.now(),
      endTime: 0,
    };

    const previousNestingLevel = this._nestingLevel;

    for (const testSuite of this._testSuites) {
      await this.runTestSuite(testSuite, summary);
    }
    this._nestingLevel = previousNestingLevel;

    this._testSuites = [];
    console.log('End of tests run 🏁');
    summary.endTime = Date.now();
    this.printSummary(summary);
  }

  private async runTestSuite(testSuite: TestSuite, summary: TestSummary) {
    this._currentTestSuite = testSuite;
    this._nestingLevel = testSuite.nestingLevel;

    console.log(`${indentNestingLevel(this._nestingLevel)} ${testSuite.name}`);

    testSuite.buildSuite();
    if (testSuite.beforeAll) {
      await testSuite.beforeAll();
    }

    for (const testCase of testSuite.testCases) {
      await this.runTestCase(testSuite, testCase, summary);
    }

    if (testSuite.afterAll) {
      await testSuite.afterAll();
    }
    this._currentTestSuite = null;
  }

  private async runTestCase(testSuite: TestSuite, testCase: TestCase, summary: TestSummary) {
    callTrackerRegistryUI.value = {};
    callTrackerRegistryJS = {};
    this._currentTestCase = testCase;

    if (testSuite.beforeEach) {
      await testSuite.beforeEach();
    }

    await testCase.run();
    this.showTestCaseSummary(testCase, summary);

    if (testSuite.afterEach) {
      await testSuite.afterEach();
    }

    this._currentTestCase = null;
    await render(null);
    await unmockAnimationTimer();
    await stopRecordingAnimationUpdates();
  }

  private showTestCaseSummary(testCase: TestCase, summary: TestSummary) {
    let mark;
    if (testCase.errors.length > 0) {
      summary.failed++;
      summary.failedTests.push(testCase.name);
      mark = color('✖', 'red');
    } else {
      summary.passed++;
      mark = color('✔', 'green');
    }
    console.log(`${indentNestingLevel(this._nestingLevel)} ${mark} ${color(testCase.name, 'gray')}`);

    for (const error of testCase.errors) {
      console.log(`${indentNestingLevel(this._nestingLevel)}\t${error}`);
    }
  }

  public expect(currentValue: TestValue): Matchers {
    assertTestCase(this._currentTestCase);
    return new Matchers(currentValue, this._currentTestCase);
  }

  public beforeAll(job: () => void) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.beforeAll = job;
  }

  public afterAll(job: () => void) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.afterAll = job;
  }

  public beforeEach(job: () => void) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.beforeEach = job;
  }

  public afterEach(job: () => void) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.afterEach = job;
  }

  private waitForPropertyValueChange(targetObject: LockObject, targetProperty: 'lock', initialValue = true) {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (targetObject[targetProperty] !== initialValue) {
          clearInterval(interval);
          resolve(targetObject[targetProperty]);
        }
      }, 10);
    });
  }

  public async runOnUIBlocking(worklet: () => void) {
    const unlock = () => (this._threadLock.lock = false);
    this._threadLock.lock = true;
    runOnUI(() => {
      'worklet';
      worklet();
      runOnJS(unlock)();
    })();
    await this.waitForPropertyValueChange(this._threadLock, 'lock', true);
  }

  public async recordAnimationUpdates() {
    const updatesContainer = createUpdatesContainer(this);
    const recordAnimationUpdates = updatesContainer.pushAnimationUpdates;
    const recordLayoutAnimationUpdates = updatesContainer.pushLayoutAnimationUpdates;

    await this.runOnUIBlocking(() => {
      'worklet';
      const originalUpdateProps = global._IS_FABRIC ? global._updatePropsFabric : global._updatePropsPaper;
      global.originalUpdateProps = originalUpdateProps;

      const mockedUpdateProps = (operations: Operation[]) => {
        recordAnimationUpdates(operations);
        originalUpdateProps(operations);
      };

      if (global._IS_FABRIC) {
        global._updatePropsFabric = mockedUpdateProps;
      } else {
        global._updatePropsPaper = mockedUpdateProps;
      }

      const originalNotifyAboutProgress = global._notifyAboutProgress;
      global.originalNotifyAboutProgress = originalNotifyAboutProgress;
      global._notifyAboutProgress = (tag: number, value: Record<string, unknown>, isSharedTransition: boolean) => {
        recordLayoutAnimationUpdates(tag, value);
        originalNotifyAboutProgress(tag, value, isSharedTransition);
      };
    });
    return updatesContainer;
  }

  public async stopRecordingAnimationUpdates() {
    await this.runOnUIBlocking(() => {
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

  public async mockAnimationTimer() {
    await this.runOnUIBlocking(() => {
      'worklet';
      global.mockedAnimationTimestamp = 0;
      global.originalGetAnimationTimestamp = global._getAnimationTimestamp;
      global._getAnimationTimestamp = () => {
        if (global.mockedAnimationTimestamp === undefined) {
          throw new Error("Animation timestamp wasn't initialized");
        }
        return global.mockedAnimationTimestamp;
      };

      let originalRequestAnimationFrame = global.requestAnimationFrame;
      global.originalRequestAnimationFrame = originalRequestAnimationFrame;
      (global as any).requestAnimationFrame = (callback: Function) => {
        originalRequestAnimationFrame(() => {
          callback(global._getAnimationTimestamp());
        });
      };

      global.originalFlushAnimationFrame = global.__flushAnimationFrame;
      global.__flushAnimationFrame = (_frameTimestamp: number) => {
        global.mockedAnimationTimestamp! += 16;
        global.__frameTimestamp = global.mockedAnimationTimestamp;
        global.originalFlushAnimationFrame!(global.mockedAnimationTimestamp!);
      };
    });
  }

  public async setAnimationTimestamp(timestamp: number) {
    await this.runOnUIBlocking(() => {
      'worklet';
      assertMockedAnimationTimestamp(global.mockedAnimationTimestamp);
      global.mockedAnimationTimestamp = timestamp;
    });
  }

  public async advanceAnimationByTime(time: number) {
    await this.runOnUIBlocking(() => {
      'worklet';
      assertMockedAnimationTimestamp(global.mockedAnimationTimestamp);
      global.mockedAnimationTimestamp += time;
    });
  }

  public async advanceAnimationByFrames(frameCount: number) {
    await this.runOnUIBlocking(() => {
      'worklet';
      assertMockedAnimationTimestamp(global.mockedAnimationTimestamp);
      global.mockedAnimationTimestamp += frameCount * 16;
    });
  }

  public async unmockAnimationTimer() {
    await this.runOnUIBlocking(() => {
      'worklet';
      if (global.originalGetAnimationTimestamp) {
        global._getAnimationTimestamp = global.originalGetAnimationTimestamp;
        global.originalGetAnimationTimestamp = undefined;
      }
      if (global.originalRequestAnimationFrame) {
        (global.requestAnimationFrame as any) = global.originalRequestAnimationFrame;
        global.originalRequestAnimationFrame = undefined;
      }
      if (global.originalFlushAnimationFrame) {
        global.__flushAnimationFrame = global.originalFlushAnimationFrame;
        global.originalFlushAnimationFrame = undefined;
      }
      if (global.mockedAnimationTimestamp) {
        global.mockedAnimationTimestamp = undefined;
      }
    });
  }

  public wait(delay: number) {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  private printSummary(summary: {
    passed: number;
    failed: number;
    failedTests: Array<string>;
    startTime: number;
    endTime: number;
  }) {
    console.log('\n');
    console.log(`🧮 Tests summary: ${color(summary.passed, 'green')} passed, ${color(summary.failed, 'red')} failed`);
    console.log(`⏱️  Total time: ${Math.round(((summary.endTime - summary.startTime) / 1000) * 100) / 100}s`);
    if (summary.failed > 0) {
      console.log('❌ Failed tests:');
      for (const failedTest of summary.failedTests) {
        console.log(`\t- ${failedTest}`);
      }
    } else {
      console.log('✅ All tests passed!');
    }
    console.log('\n');
  }
}
