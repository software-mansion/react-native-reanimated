import type { Component, MutableRefObject, ReactElement } from 'react';
import { useRef } from 'react';
import type {
  BuildFunction,
  NullableTestValue,
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
import { ComparisonMode, DescribeDecorator, TestDecorator } from './types';
import { TestComponent } from './TestComponent';
import { EMPTY_LOG_PLACEHOLDER, applyMarkdown, color, formatString, indentNestingLevel } from './stringFormatUtils';
import type { SharedValue } from 'react-native-reanimated';
import { makeMutable, runOnUI, runOnJS } from 'react-native-reanimated';
import { Matchers, nullableMatch } from './matchers/Matchers';
import { assertMockedAnimationTimestamp, assertTestCase, assertTestSuite } from './Asserts';
import { createUpdatesContainer } from './UpdatesContainer';

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
  private _includesOnly: boolean = false;
  private _summary: TestSummary = {
    passed: 0,
    failed: 0,
    skipped: 0,
    failedTests: [] as Array<string>,
    startTime: Date.now(),
    endTime: 0,
  };

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
    try {
      this._renderHook(component);
    } catch (e) {
      console.log(e);
    }
    return this.waitForPropertyValueChange(this._renderLock, 'lock');
  }

  public async clearRenderOutput() {
    return await this.render(null);
  }

  public describe(name: string, buildSuite: BuildFunction, decorator: DescribeDecorator | null) {
    if (decorator === DescribeDecorator.ONLY) {
      this._includesOnly = true;
    }

    let index: number; // We have to manage the order of the nested describes
    if (this._currentTestSuite === null) {
      index = this._testSuites.length; // If we have no parent describe, we append at the end
    } else {
      const parentIndex = this._testSuites.findIndex(testSuite => {
        return testSuite === this._currentTestSuite;
      });
      const parentNesting = this._currentTestSuite.nestingLevel;
      index = parentIndex + 1;
      while (index < this._testSuites.length && this._testSuites[index].nestingLevel > parentNesting) {
        // Append after last child of the parent describe
        // The children have bigger nesting level
        index += 1;
      }
    }

    const testDecorator = decorator || this._currentTestSuite?.decorator;

    this._testSuites.splice(index, 0, {
      name: applyMarkdown(name),
      buildSuite,
      testCases: [],
      nestingLevel: (this._currentTestSuite?.nestingLevel || 0) + 1,
      decorator: testDecorator || null,
    });
  }

  public test(name: string, run: BuildFunction, decorator: TestDecorator | null, warningMessage = '') {
    assertTestSuite(this._currentTestSuite);
    if (decorator === TestDecorator.ONLY) {
      this._includesOnly = true;
    }
    this._currentTestSuite.testCases.push({
      name: applyMarkdown(name),
      run,
      componentsRefs: {},
      callsRegistry: {},
      errors: [],
      skip: decorator === TestDecorator.SKIP || this._currentTestSuite.decorator === DescribeDecorator.SKIP,
      decorator,
      warningMessage,
    });
  }

  public testEachErrorMsg<T>(examples: Array<T>, decorator: TestDecorator) {
    return (name: string, expectedWarning: string, testCase: (example: T, index: number) => void | Promise<void>) => {
      examples.forEach((example, index) => {
        const currentTestCase = async () => {
          await testCase(example, index);
        };
        this.test(
          formatString(name, example, index),
          currentTestCase,
          decorator,
          formatString(expectedWarning, example, index),
        );
      });
    };
  }

  public testEach<T>(examples: Array<T>, decorator: TestDecorator | null) {
    return (name: string, testCase: (example: T, index: number) => void | Promise<void>) => {
      examples.forEach((example, index) => {
        const currentTestCase = async () => {
          await testCase(example, index);
        };
        this.test(formatString(name, example, index), currentTestCase, decorator);
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
    }, 1000);
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
    console.log('\n');

    for (const testSuite of this._testSuites) {
      this._currentTestSuite = testSuite;
      await testSuite.buildSuite();
      this._currentTestSuite = null;
    }

    for (const testSuite of this._testSuites) {
      let skipTestSuite = testSuite.skip;

      if (this._includesOnly) {
        skipTestSuite = skipTestSuite || !(testSuite.decorator === DescribeDecorator.ONLY);

        for (const testCase of testSuite.testCases) {
          if (testCase.decorator === TestDecorator.ONLY) {
            skipTestSuite = false;
          } else {
            testCase.skip = testCase.skip || !(testSuite.decorator === DescribeDecorator.ONLY);
          }
        }
      }
      testSuite.skip = skipTestSuite;
    }

    for (const testSuite of this._testSuites) {
      await this.runTestSuite(testSuite);
    }

    this._testSuites = [];
    console.log('End of tests run 🏁');
    this._summary.endTime = Date.now();
    this.printSummary();
  }

  private async runTestSuite(testSuite: TestSuite) {
    if (testSuite.skip) {
      this._summary.skipped += testSuite.testCases.length;
      return;
    }

    this._currentTestSuite = testSuite;
    console.log(`${indentNestingLevel(testSuite.nestingLevel)} ${testSuite.name}`);

    if (testSuite.beforeAll) {
      await testSuite.beforeAll();
    }

    for (const testCase of testSuite.testCases) {
      if (!testCase.skip) {
        await this.runTestCase(testSuite, testCase);
      } else {
        this._summary.skipped++;
      }
    }

    if (testSuite.afterAll) {
      await testSuite.afterAll();
    }
    this._currentTestSuite = null;
  }

  private async runTestCase(testSuite: TestSuite, testCase: TestCase) {
    callTrackerRegistryUI.value = {};
    callTrackerRegistryJS = {};
    this._currentTestCase = testCase;

    if (testSuite.beforeEach) {
      await testSuite.beforeEach();
    }

    if (testCase.decorator === TestDecorator.FAILING || testCase.decorator === TestDecorator.WARN) {
      const consoleTrackerRef = testCase.decorator === TestDecorator.FAILING ? 'console.error' : 'console.warn';
      const message = makeMutable('');

      const newConsoleFuncJS = (warning: string) => {
        this.callTracker(consoleTrackerRef);
        message.value = warning.split('\n\nThis error is located at:')[0];
      };
      console.error = newConsoleFuncJS;
      console.warn = newConsoleFuncJS;

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const callTrackerCopy = this.callTracker;

      runOnUI(() => {
        'worklet';
        const newConsoleFuncUI = (warning: string) => {
          callTrackerCopy(consoleTrackerRef);
          message.value = warning.split('\n\nThis error is located at:')[0];
        };
        console.error = newConsoleFuncUI;
        console.warn = newConsoleFuncUI;
      })();

      await testCase.run();

      this.expect(this.getTrackerCallCount(consoleTrackerRef)).toBeCalled(1);
      if (testCase.warningMessage) {
        this.expect(message.value).toBe(testCase.warningMessage, ComparisonMode.STRING);
      }
    } else {
      await testCase.run();
    }

    this.showTestCaseSummary(testCase, testSuite.nestingLevel);

    if (testSuite.afterEach) {
      await testSuite.afterEach();
    }

    this._currentTestCase = null;
    await this.render(null);
    await this.unmockAnimationTimer();
    await this.stopRecordingAnimationUpdates();
  }

  private showTestCaseSummary(testCase: TestCase, nestingLevel: number) {
    let mark;
    if (testCase.errors.length > 0) {
      this._summary.failed++;
      this._summary.failedTests.push(testCase.name);
      mark = color('✖', 'red');
    } else {
      this._summary.passed++;
      mark = color('✔', 'green');
    }
    console.log(`${indentNestingLevel(nestingLevel)} ${mark} ${color(testCase.name, 'gray')}`);

    for (const error of testCase.errors) {
      const indentedError = error.replace(/\n/g, '\n' + EMPTY_LOG_PLACEHOLDER + indentNestingLevel(nestingLevel + 2));
      console.log(`${indentNestingLevel(nestingLevel)}\t${indentedError}`);
    }
  }

  public expect(currentValue: TestValue): Matchers {
    assertTestCase(this._currentTestCase);
    return new Matchers(currentValue, this._currentTestCase);
  }

  public expectNullable(currentValue: NullableTestValue) {
    assertTestCase(this._currentTestCase);
    nullableMatch(currentValue, this._currentTestCase);
  }

  public expectNotNullable(currentValue: NullableTestValue) {
    assertTestCase(this._currentTestCase);
    nullableMatch(currentValue, this._currentTestCase, true);
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

  private waitForPropertyValueChange(
    targetObject: LockObject,
    targetProperty: 'lock',
    initialValue = true,
    maxWaitTime?: number,
  ) {
    return new Promise(resolve => {
      const startTime = performance.now();
      const interval = setInterval(() => {
        const currentTime = performance.now();
        const waitTimeExceeded = maxWaitTime && maxWaitTime < currentTime - startTime;
        if (targetObject[targetProperty] !== initialValue || waitTimeExceeded) {
          clearInterval(interval);
          resolve(targetObject[targetProperty]);
        }
      }, 10);
    });
  }

  public async runOnUIBlocking(worklet: () => void, maxWaitTime?: number) {
    const unlock = () => (this._threadLock.lock = false);
    this._threadLock.lock = true;
    runOnUI(() => {
      'worklet';
      worklet();
      runOnJS(unlock)();
    })();
    await this.waitForPropertyValueChange(this._threadLock, 'lock', true, maxWaitTime);
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

      const originalRequestAnimationFrame = global.requestAnimationFrame;
      global.originalRequestAnimationFrame = originalRequestAnimationFrame;
      global.requestAnimationFrame = (callback: FrameRequestCallback) => {
        originalRequestAnimationFrame(() => {
          callback(global._getAnimationTimestamp());
        });
        return 0;
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

  private printSummary() {
    const { passed, failed, failedTests, startTime, endTime, skipped } = this._summary;

    console.log('\n');
    console.log(
      `🧮 Tests summary: ${color(passed, 'green')} passed, ${color(failed, 'red')} failed, ${color(
        skipped,
        'orange',
      )} skipped`,
    );
    console.log(`⏱️  Total time: ${Math.round(((endTime - startTime) / 1000) * 100) / 100}s`);
    if (failed > 0) {
      console.log('❌ Failed tests:');
      for (const failedTest of failedTests) {
        console.log(`\t- ${failedTest}`);
      }
    } else {
      console.log('✅ All tests passed!');
    }
    console.log('\n');
  }
}
