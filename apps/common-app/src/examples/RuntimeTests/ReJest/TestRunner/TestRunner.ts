import type { Component, MutableRefObject, ReactElement } from 'react';
import { useRef } from 'react';
import type {
  BuildFunction,
  NullableTestValue,
  SharedValueSnapshot,
  TestCase,
  TestConfiguration,
  TestSuite,
  TestValue,
  TrackerCallCount,
} from '../types';
import { DescribeDecorator, TestDecorator } from '../types';
import { TestComponent } from '../TestComponent';
import { applyMarkdown, formatString } from '../utils/stringFormatUtils';
import type {
  SharedValue,
  LayoutAnimationStartFunction,
  LayoutAnimationType,
  SharedTransitionAnimationsValues,
  LayoutAnimation,
} from 'react-native-reanimated';
import { Matchers, nullableMatch } from '../matchers/Matchers';
import { assertMockedAnimationTimestamp, assertTestCase, assertTestSuite } from './Asserts';
import { makeMutable, runOnJS } from 'react-native-reanimated';
import { RenderLock, SyncUIRunner } from '../utils/SyncUIRunner';
import { TestSummaryLogger } from './TestSummaryLogger';
import { AnimationUpdatesRecorder } from './AnimationUpdatesRecorder';
export { Presets } from '../Presets';

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
  private _valueRegistry: Record<string, SharedValue> = {};
  private _includesOnly: boolean = false;
  private _syncUIRunner: SyncUIRunner = new SyncUIRunner();
  private _renderLock: RenderLock = new RenderLock();
  private _testSummary: TestSummaryLogger = new TestSummaryLogger();

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
    if (!component && this._renderLock.wasRenderedNull()) {
      return;
    }

    this._renderLock.setRenderedNull(!component);
    this._renderLock.lock();

    try {
      this._renderHook(component);
    } catch (e) {
      console.log(e);
    }
    return this._renderLock.waitForUnlock();
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
    await this._syncUIRunner.runOnUIBlocking(() => {
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
    this._testSummary.printSummary();
  }

  private async runTestSuite(testSuite: TestSuite) {
    this._testSummary.countSkippedTestSuiteTests(testSuite);

    if (testSuite.skip) {
      return;
    }

    this._currentTestSuite = testSuite;
    this._testSummary.logRunningTestSuite(testSuite);

    if (testSuite.beforeAll) {
      await testSuite.beforeAll();
    }

    for (const testCase of testSuite.testCases) {
      if (!testCase.skip) {
        await this.runTestCase(testSuite, testCase);
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
      const [restoreConsole, checkErrors] = await this.mockConsole(testCase);
      await testCase.run();
      await restoreConsole();
      checkErrors();
    } else {
      await testCase.run();
    }

    this._testSummary.showTestCaseSummary(testCase, testSuite.nestingLevel);

    if (testSuite.afterEach) {
      await testSuite.afterEach();
    }

    this._currentTestCase = null;
    await this.render(null);
    const animationUpdatesRecorder = new AnimationUpdatesRecorder();
    await animationUpdatesRecorder.unmockAnimationTimer();
    await animationUpdatesRecorder.stopRecordingAnimationUpdates();
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

  public async unmockWindowDimensions() {
    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      if (global.originalLayoutAnimationsManager) {
        global.LayoutAnimationsManager = global.originalLayoutAnimationsManager;
      }
    });
  }

  public async mockWindowDimensions() {
    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      const originalLayoutAnimationsManager = global.LayoutAnimationsManager;

      const startLayoutAnimation: LayoutAnimationStartFunction = (
        tag: number,
        type: LayoutAnimationType,
        _yogaValues: Partial<SharedTransitionAnimationsValues>,
        config: (arg: Partial<SharedTransitionAnimationsValues>) => LayoutAnimation,
      ) => {
        originalLayoutAnimationsManager.start(
          tag,
          type,
          {
            ..._yogaValues,
            windowHeight: 852,
            windowWidth: 393,
          },
          config,
        );
      };

      global.originalLayoutAnimationsManager = originalLayoutAnimationsManager;
      global.LayoutAnimationsManager = {
        start: startLayoutAnimation,
        stop: originalLayoutAnimationsManager.stop,
      };
    });
  }

  public wait(delay: number) {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  public waitForAnimationUpdates(updatesCount: number): Promise<boolean> {
    const CHECK_INTERVAL = 20;
    const flag = makeMutable(false);
    return new Promise<boolean>(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const interval = setInterval(async () => {
        await new SyncUIRunner().runOnUIBlocking(() => {
          'worklet';
          assertMockedAnimationTimestamp(global.framesCount);
          flag.value = global.framesCount >= updatesCount - 1;
        });
        if (flag.value) {
          clearInterval(interval);
          resolve(true);
        }
      }, CHECK_INTERVAL);
    });
  }

  private async mockConsole(testCase: TestCase): Promise<[() => Promise<void>, () => void]> {
    const counterUI = makeMutable(0);
    let counterJS = 0;
    const recordedMessage = makeMutable('');

    const originalError = console.error;
    const originalWarning = console.warn;

    const incrementJS = () => {
      counterJS++;
    };
    const mockedConsoleFunction = (message: string) => {
      'worklet';
      if (_WORKLET) {
        counterUI.value++;
      } else {
        incrementJS();
      }
      recordedMessage.value = message.split('\n\nThis error is located at:')[0];
    };
    console.error = mockedConsoleFunction;
    console.warn = mockedConsoleFunction;
    await this._syncUIRunner.runOnUIBlocking(() => {
      'worklet';
      console.error = mockedConsoleFunction;
      console.warn = mockedConsoleFunction;
    });

    const restoreConsole = async () => {
      console.error = originalError;
      console.warn = originalWarning;
      await this._syncUIRunner.runOnUIBlocking(() => {
        'worklet';
        console.error = originalError;
        console.warn = originalWarning;
      });
    };

    const checkErrors = () => {
      if (testCase.decorator !== TestDecorator.WARN && testCase.decorator !== TestDecorator.FAILING) {
        return;
      }
      const count = counterUI.value + counterJS;
      this.expect(count).toBe(1);
      this.expect(recordedMessage.value).toBe(testCase.warningMessage);
    };

    return [restoreConsole, checkErrors];
  }
}
