import type { MutableRefObject, Component, ReactElement } from 'react';
import { useRef } from 'react';
import type { TestCase, TestConfiguration, TestSuite, TestValue } from '../types';
import { TestComponent } from '../TestComponent';
import { Matchers } from '../matchers/Matchers';
import { RenderLock } from '../utils/SyncUIRunner';
import { ValueRegistry } from './ValueRegistry';
import { TestSummaryLogger } from './TestSummaryLogger';
import { WindowDimensionsMocker } from './WindowDimensionsMocker';
import { AnimationUpdatesRecorder } from './AnimationUpdatesRecorder';
import { CallTrackerRegistry } from './CallTrackerRegistry';
import { NotificationRegistry } from './NotificationRegistry';
import { assertExecutionManager } from './Asserts';
import { TestSuiteExecutionManager, TestSuitePreExecutionManager } from './TestSuiteManager';
export { Presets } from '../Presets';

export class TestRunner {
  private _renderHook: (component: ReactElement<Component> | null) => void = () => {};
  private _renderLock: RenderLock = new RenderLock();
  private _testSummary: TestSummaryLogger = new TestSummaryLogger();
  private _windowDimensionsMocker: WindowDimensionsMocker = new WindowDimensionsMocker();
  private _animationRecorder = new AnimationUpdatesRecorder();
  private _valueRegistry = new ValueRegistry();
  private _callTrackerRegistry = new CallTrackerRegistry();
  private _notificationRegistry = new NotificationRegistry();
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

  public getCallTrackerRegistry() {
    return this._callTrackerRegistry;
  }

  public getNotificationRegistry() {
    return this._notificationRegistry;
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
    this._callTrackerRegistry.resetRegistry();
    testSuiteExecutionManager.setCurrentTestCase(testCase);

    if (testSuite.beforeEach) {
      await testSuite.beforeEach();
    }
    await testCase.run();

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
}
