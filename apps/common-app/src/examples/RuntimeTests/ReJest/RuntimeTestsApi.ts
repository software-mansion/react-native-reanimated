import type { Component, ReactElement } from 'react';
import { TestRunner } from './TestRunner/TestRunner';
import type { TestComponent } from './TestComponent';
import type { SharedValue } from 'react-native-reanimated';
import type { TestConfiguration, TestValue, BuildFunction } from './types';
import { DescribeDecorator, TestDecorator } from './types';

export { Presets } from './Presets';

const testRunner = new TestRunner();
const windowDimensionsMocker = testRunner.getWindowDimensionsMocker();
const animationRecorder = testRunner.getAnimationUpdatesRecorder();
const valueRegistry = testRunner.getValueRegistry();
const callTrackerRegistry = testRunner.getCallTrackerRegistry();
const notificationRegistry = testRunner.getNotificationRegistry();

type DescribeFunction = (name: string, buildSuite: BuildFunction) => void;
type TestFunction = (name: string, buildTest: BuildFunction) => void;
type TestEachFunction = <T>(
  examples: Array<T>,
) => (name: string, testCase: (example: T, index: number) => void | Promise<void>) => void;
type DecoratedTestFunction = TestFunction & { each: TestEachFunction };

const describeBasic = (name: string, buildSuite: BuildFunction) => {
  testRunner.describe(name, buildSuite, null);
};

export const describe = <DescribeFunction & Record<DescribeDecorator, DescribeFunction>>describeBasic;
describe.skip = (name, buildSuite) => {
  testRunner.describe(name, buildSuite, DescribeDecorator.SKIP);
};
describe.only = (name, buildSuite) => {
  testRunner.describe(name, buildSuite, DescribeDecorator.ONLY);
};

const testBasic: DecoratedTestFunction = (name: string, testCase: BuildFunction) => {
  testRunner.test(name, testCase, null);
};
testBasic.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples, null);
};
const testSkip: DecoratedTestFunction = (name: string, testCase: BuildFunction) => {
  testRunner.test(name, testCase, TestDecorator.SKIP);
};
testSkip.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples, TestDecorator.SKIP);
};
const testOnly: DecoratedTestFunction = (name: string, testCase: BuildFunction) => {
  testRunner.test(name, testCase, TestDecorator.ONLY);
};
testOnly.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples, TestDecorator.ONLY);
};

type TestType = DecoratedTestFunction & Record<TestDecorator.SKIP | TestDecorator.ONLY, DecoratedTestFunction>;

export const test = <TestType>testBasic;
test.skip = testSkip;
test.only = testOnly;

export function beforeAll(job: () => void) {
  testRunner.beforeAll(job);
}

export function beforeEach(job: () => void) {
  testRunner.beforeEach(job);
}

export function afterEach(job: () => void) {
  testRunner.afterEach(job);
}

export function afterAll(job: () => void) {
  testRunner.afterAll(job);
}

export async function render(component: ReactElement<Component> | null) {
  return testRunner.render(component);
}

export async function clearRenderOutput() {
  return testRunner.clearRenderOutput();
}

export function useTestRef(name: string) {
  return testRunner.useTestRef(name);
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const testRunnerCallTrackerFn = callTrackerRegistry.callTracker;
export function callTracker(name: string) {
  'worklet';
  return testRunnerCallTrackerFn(name);
}

export function callTrackerFn(name: string) {
  'worklet';
  return () => {
    'worklet';
    testRunnerCallTrackerFn(name);
  };
}

export function getTrackerCallCount(name: string) {
  return callTrackerRegistry.getTrackerCallCount(name);
}

export function registerValue<TValue = unknown>(name: string, value: SharedValue<TValue>) {
  return valueRegistry.registerValue(name, value);
}

export async function getRegisteredValue(name: string) {
  return await valueRegistry.getRegisteredValue(name);
}

export function getTestComponent(name: string): TestComponent {
  return testRunner.getTestComponent(name);
}

export async function runTests() {
  await testRunner.runTests();
}

export async function wait(delay: number) {
  await animationRecorder.wait(delay);
}

export async function waitForAnimationUpdates(updatesCount: number) {
  await animationRecorder.waitForAnimationUpdates(updatesCount);
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const testRunnerNotifyFn = notificationRegistry.notify;
export function notify(name: string) {
  'worklet';
  return testRunnerNotifyFn(name);
}

export async function waitForNotify(name: string) {
  return notificationRegistry.waitForNotify(name);
}

export function expect(value: TestValue) {
  return testRunner.expect(value);
}

export function configure(config: TestConfiguration) {
  return testRunner.configure(config);
}

export async function mockAnimationTimer() {
  await animationRecorder.mockAnimationTimer();
}

export async function unmockAnimationTimer() {
  await animationRecorder.unmockAnimationTimer();
}

export async function mockWindowDimensions() {
  await windowDimensionsMocker.mockWindowDimensions();
}

export async function unmockWindowDimensions() {
  await windowDimensionsMocker.unmockWindowDimensions();
}

export async function recordAnimationUpdates() {
  return animationRecorder.recordAnimationUpdates();
}

export async function stopRecordingAnimationUpdates() {
  await animationRecorder.stopRecordingAnimationUpdates();
}
