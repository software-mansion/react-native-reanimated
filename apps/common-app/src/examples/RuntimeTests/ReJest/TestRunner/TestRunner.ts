import type { Component, MutableRefObject, ReactElement } from 'react';
import { useRef } from 'react';
import type { MaybeAsync, TestCase, TestConfiguration, TestSuite, TestValue } from '../types';
import { TestComponent } from '../TestComponent';
import { Matchers } from '../matchers/Matchers';
import { assertTestCase, assertTestSuite } from './Asserts';
import { RenderLock } from '../utils/SyncUIRunner';
import { ValueRegistry } from './ValueRegistry';
import { TestSummaryLogger } from './TestSummaryLogger';
import { WindowDimensionsMocker } from './WindowDimensionsMocker';
import { AnimationUpdatesRecorder } from './AnimationUpdatesRecorder';
import { CallTrackerRegistry } from './CallTrackerRegistry';
import { NotificationRegistry } from './NotificationRegistry';
import { TestSuiteBuilder } from './TestSuiteBuilder';
export { Presets } from '../Presets';

export class TestRunner {
  private _currentTestSuite: TestSuite | null = null;
  private _currentTestCase: TestCase | null = null;
  private _renderHook: (component: ReactElement<Component> | null) => void = () => {};
  private _renderLock: RenderLock = new RenderLock();
  private _testSummary: TestSummaryLogger = new TestSummaryLogger();
  private _windowDimensionsMocker: WindowDimensionsMocker = new WindowDimensionsMocker();
  private _animationRecorder = new AnimationUpdatesRecorder();
  private _valueRegistry = new ValueRegistry();
  private _callTrackerRegistry = new CallTrackerRegistry();
  private _notificationRegistry = new NotificationRegistry();
  private _testSuiteBuilder = new TestSuiteBuilder();

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

  public getTestSuiteBuilder() {
    return this._testSuiteBuilder;
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

  public useTestRef(name: string): MutableRefObject<Component | null> {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ref = useRef(null);
    assertTestCase(this._currentTestCase);
    this._currentTestCase.componentsRefs[name] = ref;
    return ref;
  }

  public getTestComponent(name: string): TestComponent {
    assertTestCase(this._currentTestCase);
    const componentRef = this._currentTestCase.componentsRefs[name];
    return new TestComponent(componentRef);
  }

  public async runTests(): Promise<boolean> {
    console.log('\n');
    await this._testSuiteBuilder.buildTests();
    for (const testSuite of this._testSuiteBuilder.getTestSuites()) {
      await this.runTestSuite(testSuite);
    }
    this._testSummary.printSummary();
    return this._testSummary.allTestsPassed();
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
    this._callTrackerRegistry.resetRegistry();
    this._currentTestCase = testCase;

    if (testSuite.beforeEach) {
      await testSuite.beforeEach();
    }
    await testCase.run();

    this._testSummary.showTestCaseSummary(testCase, testSuite.nestingLevel);

    if (testSuite.afterEach) {
      await testSuite.afterEach();
    }

    this._currentTestCase = null;
    await this.render(null);
    await this._animationRecorder.unmockAnimationTimer();
    await this._animationRecorder.stopRecordingAnimationUpdates();
  }

  public expect(currentValue: TestValue): Matchers {
    assertTestCase(this._currentTestCase);
    return new Matchers(currentValue, this._currentTestCase);
  }

  public beforeAll(job: MaybeAsync<void>) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.beforeAll = job;
  }

  public afterAll(job: MaybeAsync<void>) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.afterAll = job;
  }

  public beforeEach(job: MaybeAsync<void>) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.beforeEach = job;
  }

  public afterEach(job: MaybeAsync<void>) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite.afterEach = job;
  }
}
