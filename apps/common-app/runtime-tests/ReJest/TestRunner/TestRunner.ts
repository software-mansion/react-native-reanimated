import type { Component, ReactElement, RefObject } from 'react';
import { useRef } from 'react';
import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';

import type { ValueGetter } from '../matchers/EventualMatchers';
import { EventualMatchers } from '../matchers/EventualMatchers';
import { Matchers } from '../matchers/Matchers';
import { SharedValueMatchers } from '../matchers/SharedValueMatchers';
import { TestComponent } from '../TestComponent';
import type {
  DefaultValue,
  ValueWrapper,
  TestCase,
  TestConfiguration,
  TestProgress,
  TestSuite,
  TestValue,
} from '../types';
import { TestDecorator } from '../types';
import { RenderLock } from '../utils/RenderLock';
import { sleep } from '../utils/waitFor';
import { waitForFrames } from '../utils/waitForFrames';
import { AnimationUpdatesRecorder } from './AnimationUpdatesRecorder';
import { assertTestCase } from './Asserts';
import { CallTrackerRegistry } from './CallTrackerRegistry';
import { NotificationRegistry } from './NotificationRegistry';
import { TestSuiteBuilder } from './TestSuiteBuilder';
import { TestSummaryLogger } from './TestSummaryLogger';
import { ValueRegistry } from './ValueRegistry';
import { WindowDimensionsMocker } from './WindowDimensionsMocker';
import { WorkletRuntimePool } from './WorkletRuntimePool';
import { scheduleOnRN } from 'react-native-worklets';

export { Presets } from '../Presets';

const RENDER_MAX_WAIT_TIME_MS = 10000;
const MOUNT_MAX_WAIT_TIME_MS = 1000;
const DRAIN_MAX_WAIT_TIME_MS = 5000;
const FRAME_INTERVAL_MS = 16;

export class TestRunner {
  private _currentTestCase: TestCase | null = null;
  private _renderHook: (component: ReactElement<Component> | null) => void =
    () => {};
  private _renderLock: RenderLock = new RenderLock();
  private _testSummary: TestSummaryLogger = new TestSummaryLogger();
  private _windowDimensionsMocker: WindowDimensionsMocker =
    new WindowDimensionsMocker();
  private _animationRecorder = new AnimationUpdatesRecorder();
  private _valueRegistry = new ValueRegistry();
  private _callTrackerRegistry = new CallTrackerRegistry();
  private _notificationRegistry = new NotificationRegistry();
  private _workletRuntimePool = new WorkletRuntimePool();
  private _progressHook: ((progress: TestProgress) => void) | null = null;
  private _progressIndex: number = 0;
  private _progressTotal: number = 0;
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

  public getWorkletRuntimePool() {
    return this._workletRuntimePool;
  }

  public getTestSuiteBuilder() {
    return this._testSuiteBuilder;
  }

  public configure(config: TestConfiguration) {
    this._renderHook = config.render;
    this._progressHook = config.onProgress ?? null;
    return this._renderLock;
  }

  public createTestValue<T = DefaultValue>(
    defaultValue: T | DefaultValue,
    customSetter?: (prev: T, current: T) => T
  ): [
    ValueWrapper<T>,
    (value?: T | DefaultValue, notificationName?: string) => void,
  ] {
    const state: ValueWrapper<T> = {
      value: defaultValue,
    };
    const jsSetter = (
      value: T | DefaultValue = 'ok',
      notificationName?: string
    ) => {
      if (customSetter) {
        state.value = customSetter(state.value as T, value as T);
      } else {
        state.value = value;
      }
      if (notificationName) {
        this._notificationRegistry.notify(notificationName);
      }
    };
    const setter = (value?: T | DefaultValue, notificationName?: string) => {
      'worklet';
      scheduleOnRN(jsSetter, value, notificationName);
    };
    return [state, setter];
  }

  public createOrderConstraint() {
    'worklet';
    return this.createTestValue<number>(0, (prev: number, current: number) => {
      'worklet';
      if (prev == current - 1) {
        return current;
      } else if (prev == 0) {
        return -1;
      }
      return prev;
    });
  }

  public async render(component: ReactElement<Component> | null) {
    if (!component && this._renderLock.wasRenderedNull()) {
      return;
    }

    const previousRefs = new Set(
      Object.values(this._currentTestCase?.componentsRefs ?? {})
    );

    this._renderLock.setRenderedNull(!component);
    this._renderLock.lock();

    try {
      this._renderHook(component);
    } catch (e) {
      console.log(e);
    }
    try {
      await this._renderLock.waitForRender(RENDER_MAX_WAIT_TIME_MS);
    } finally {
      this._renderLock.unlock();
    }

    if (component) {
      await this._waitForMount(previousRefs);
    }
  }

  private async _waitForMount(
    previousRefs: Set<RefObject<any>>,
    maxWaitTime = MOUNT_MAX_WAIT_TIME_MS
  ) {
    const testCase = this._currentTestCase;
    if (!testCase) {
      return;
    }
    const newRefEntries = Object.entries(testCase.componentsRefs).filter(
      ([, ref]) => !previousRefs.has(ref)
    );
    const deadline = performance.now() + maxWaitTime;
    for (const [name, ref] of newRefEntries) {
      let mounted = false;
      do {
        const instance = ref.current;
        const tag = instance ? (findNodeHandle(instance) ?? -1) : -1;
        if (tag !== -1) {
          mounted = await getViewProp(tag, 'width', instance).then(
            () => true,
            () => false
          );
          if (mounted) {
            break;
          }
        }
        await sleep(FRAME_INTERVAL_MS);
      } while (performance.now() < deadline);
      if (!mounted) {
        throw new Error(
          `Test component '${name}' did not mount within ${maxWaitTime}ms after render`
        );
      }
    }
  }

  public async clearRenderOutput() {
    return await this.render(null);
  }

  public useTestRef(name: string): RefObject<any> {
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

  public async runTests() {
    console.log('\n');
    await this._testSuiteBuilder.buildTests();
    this._progressIndex = 0;
    this._progressTotal = this._testSuiteBuilder
      .getTestSuites()
      .reduce(
        (sum, suite) =>
          suite.skip
            ? sum
            : sum + suite.testCases.filter((testCase) => !testCase.skip).length,
        0
      );
    for (const testSuite of this._testSuiteBuilder.getTestSuites()) {
      await this.runTestSuite(testSuite);
    }
    this._testSummary.printSummary();
    return this._testSummary.getSummary();
  }

  private async runTestSuite(testSuite: TestSuite) {
    this._testSummary.countSkippedTestSuiteTests(testSuite);

    if (testSuite.skip) {
      return;
    }

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
  }

  private async runTestCase(testSuite: TestSuite, testCase: TestCase) {
    this._callTrackerRegistry.resetRegistry();
    this._notificationRegistry.resetRegistry();
    this._currentTestCase = testCase;
    this._progressIndex += 1;
    this._progressHook?.({
      current: this._progressIndex,
      total: this._progressTotal,
      currentName: testCase.name,
    });

    try {
      if (testSuite.beforeEach) {
        await testSuite.beforeEach();
      }
      await testCase.run();
    } catch (error) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      testCase.errors.push(`[uncaught] ${message}`);
    }

    if (testCase.decorator === TestDecorator.FAILING) {
      if (testCase.errors.length > 0) {
        testCase.errors.length = 0;
      } else {
        testCase.errors.push('Expected the test to fail, but it passed');
      }
    }

    const reportCleanupError = (error: unknown) => {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      testCase.errors.push(`[uncaught in test cleanup] ${message}`);
      console.error(`[uncaught in test cleanup] ${message}`);
    };

    try {
      if (testSuite.afterEach) {
        await testSuite.afterEach();
      }

      await waitForFrames(1, DRAIN_MAX_WAIT_TIME_MS);

      this._currentTestCase = null;
      await this.render(null);
    } catch (error) {
      reportCleanupError(error);
    } finally {
      this._currentTestCase = null;
      try {
        await this._animationRecorder.unmockAnimationTimer();
      } catch (error) {
        reportCleanupError(error);
      }
      try {
        await this._animationRecorder.stopRecordingAnimationUpdates();
      } catch (error) {
        reportCleanupError(error);
      }
    }

    this._testSummary.showTestCaseSummary(testCase, testSuite.nestingLevel);
  }

  public expect(currentValue: TestValue): Matchers {
    assertTestCase(this._currentTestCase);
    return new Matchers(currentValue, this._currentTestCase);
  }

  public expectSharedValue(name: string): SharedValueMatchers {
    assertTestCase(this._currentTestCase);
    return new SharedValueMatchers(
      this._valueRegistry,
      name,
      this._currentTestCase
    );
  }

  public expectEventually(
    getValue: ValueGetter,
    timeout?: number
  ): EventualMatchers {
    assertTestCase(this._currentTestCase);
    return new EventualMatchers(getValue, this._currentTestCase, timeout);
  }
}
