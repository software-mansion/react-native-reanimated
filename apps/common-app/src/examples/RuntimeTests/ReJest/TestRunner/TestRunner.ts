import type { MutableRefObject, Component, ReactElement } from 'react';
import { useRef } from 'react';
import type { TestCase, TestConfiguration, TestSuite, TestValue, TrackerCallCount } from '../types';
import { TestDecorator } from '../types';
import { Matchers } from '../matchers/Matchers';
import { assertExecutionManager, assertMockedAnimationTimestamp } from './Asserts';
import { makeMutable, runOnJS } from 'react-native-reanimated';
import { RenderLock, SyncUIRunner } from '../utils/SyncUIRunner';
import { ValueRegistry } from './ValueRegistry';
import { TestSummaryLogger } from './TestSummaryLogger';
import { WindowDimensionsMocker } from './WindowDimensionsMocker';
import { AnimationUpdatesRecorder } from './AnimationUpdatesRecorder';
import { TestSuiteExecutionManager, TestSuitePreExecutionManager } from './TestSuiteManager';
import { TestComponent } from '../TestComponent';
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
  private _renderHook: (component: ReactElement<Component> | null) => void = () => {};
  private _syncUIRunner: SyncUIRunner = new SyncUIRunner();
  private _renderLock: RenderLock = new RenderLock();
  private _testSummary: TestSummaryLogger = new TestSummaryLogger();
  private _windowDimensionsMocker: WindowDimensionsMocker = new WindowDimensionsMocker();
  private _animationRecorder = new AnimationUpdatesRecorder();
  private _valueRegistry = new ValueRegistry();
  private _testSuiteInitialManager = new TestSuitePreExecutionManager();
  private _testSuiteExecutionManager: TestSuiteExecutionManager | null = null;

  public getWindowDimensionsMocker() {
    return this._windowDimensionsMocker;
  }

  public getAnimationUpdatesRecorder() {
    return this._animationRecorder;
  }

  public getValueRegistry() {
    return this._valueRegistry;
  }

  public getTestSuiteManager() {
    return this._testSuiteInitialManager;
  }

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

  public getTrackerCallCount(name: string): TrackerCallCount {
    return {
      name,
      onJS: callTrackerRegistryJS[name] ?? 0,
      onUI: callTrackerRegistryUI.value[name] ?? 0,
    };
  }

  public async runTests() {
    console.log('\n');
    await this._testSuiteInitialManager.buildSuites();
    this._testSuiteInitialManager.setSkipFlags();

    const testSuiteExecutionManager = new TestSuiteExecutionManager(this._testSuiteInitialManager);
    this._testSuiteExecutionManager = testSuiteExecutionManager;

    for (const testSuite of testSuiteExecutionManager.getTestSuites()) {
      await this.runTestSuite(testSuite, testSuiteExecutionManager);
    }

    this._testSummary.printSummary();
  }

  private async runTestSuite(testSuite: TestSuite, testSuiteExecutionManager: TestSuiteExecutionManager) {
    this._testSummary.countSkippedTestSuiteTests(testSuite);
    if (testSuite.skip) {
      return;
    }

    this._testSummary.logRunningTestSuite(testSuite);
    testSuiteExecutionManager.setCurrentTestSuite(testSuite);

    if (testSuite.beforeAll) {
      await testSuite.beforeAll();
    }

    for (const testCase of testSuite.testCases) {
      if (!testCase.skip) {
        await this.runTestCase(testSuite, testCase, testSuiteExecutionManager);
      }
    }

    if (testSuite.afterAll) {
      await testSuite.afterAll();
    }

    testSuiteExecutionManager.resetCurrentTestSuite();
  }

  private async runTestCase(
    testSuite: TestSuite,
    testCase: TestCase,
    testSuiteExecutionManager: TestSuiteExecutionManager,
  ) {
    callTrackerRegistryUI.value = {};
    callTrackerRegistryJS = {};
    testSuiteExecutionManager.setCurrentTestCase(testCase);

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

    testSuiteExecutionManager.resetCurrentTestCase();
    await this.render(null);
    await this._animationRecorder.unmockAnimationTimer();
    await this._animationRecorder.stopRecordingAnimationUpdates();
  }

  public expect(currentValue: TestValue): Matchers {
    assertExecutionManager(this._testSuiteExecutionManager);
    return new Matchers(currentValue, this._testSuiteExecutionManager.getCurrentTestCase());
  }

  public useTestRef(name: string): MutableRefObject<Component | null> {
    assertExecutionManager(this._testSuiteExecutionManager);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ref = useRef(null);
    this._testSuiteExecutionManager.getCurrentTestCase().componentsRefs[name] = ref;
    return ref;
  }

  public getTestComponent(name: string): TestComponent {
    assertExecutionManager(this._testSuiteExecutionManager);

    const componentRef = this._testSuiteExecutionManager.getCurrentTestCase().componentsRefs[name];
    return new TestComponent(componentRef);
  }

  public beforeAll(job: () => void) {
    this._testSuiteInitialManager.setJob('beforeAll', job);
  }

  public afterAll(job: () => void) {
    this._testSuiteInitialManager.setJob('afterAll', job);
  }

  public beforeEach(job: () => void) {
    this._testSuiteInitialManager.setJob('beforeEach', job);
  }

  public afterEach(job: () => void) {
    this._testSuiteInitialManager.setJob('afterEach', job);
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
