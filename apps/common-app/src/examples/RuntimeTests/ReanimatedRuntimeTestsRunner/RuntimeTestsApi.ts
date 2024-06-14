import type { Component, ReactElement } from 'react';
import { TestRunner } from './TestRunner';
import type { TestComponent } from './TestComponent';
import type { SharedValue } from 'react-native-reanimated';
import type { TestConfiguration, TestValue, NullableTestValue, BuildFunction } from './types';
import { DescribeDecorator, TestDecorator } from './types';

export { Presets } from './Presets';

const testRunner = new TestRunner();

type DescribeFunction = (name: string, buildSuite: BuildFunction) => void;
type TestFunction = (name: string, buildTest: BuildFunction) => void;
type TestFunctionWithWarning = (name: string, warningMessage: string, buildTest: BuildFunction) => void;
type TestEachFunction = <T>(
  examples: Array<T>,
) => (name: string, testCase: (example: T, index: number) => void | Promise<void>) => void;
type TestEachFunctionWithWarning = <T>(
  examples: Array<T>,
) => (name: string, expectedWarning: string, testCase: (example: T, index: number) => void | Promise<void>) => void;
type DecoratedTestFunction = TestFunction & { each: TestEachFunction };
type DecoratedTestFunctionWithWarning = TestFunctionWithWarning & { each: TestEachFunctionWithWarning };

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
const testFailing: DecoratedTestFunctionWithWarning = (
  name: string,
  expectedWarning: string,
  testCase: BuildFunction,
) => {
  testRunner.test(name, testCase, TestDecorator.FAILING, expectedWarning);
};
testFailing.each = <T>(examples: Array<T>) => {
  return testRunner.testEachErrorMsg(examples, TestDecorator.FAILING);
};
const testWarn: DecoratedTestFunctionWithWarning = (name: string, expectedWarning: string, testCase: BuildFunction) => {
  testRunner.test(name, testCase, TestDecorator.WARN, expectedWarning);
};
testWarn.each = <T>(examples: Array<T>) => {
  return testRunner.testEachErrorMsg(examples, TestDecorator.WARN);
};

type TestType = DecoratedTestFunction &
  Record<TestDecorator.SKIP | TestDecorator.ONLY, DecoratedTestFunction> &
  Record<TestDecorator.FAILING | TestDecorator.WARN, DecoratedTestFunctionWithWarning>;

export const test = <TestType>testBasic;
test.skip = testSkip;
test.only = testOnly;
test.failing = testFailing;
test.warn = testWarn;

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
const testRunnerCallTrackerFn = testRunner.callTracker;
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
  return testRunner.getTrackerCallCount(name);
}

export function registerValue(name: string, value: SharedValue) {
  return testRunner.registerValue(name, value);
}

export async function getRegisteredValue(name: string) {
  return await testRunner.getRegisteredValue(name);
}

export function getTestComponent(name: string): TestComponent {
  return testRunner.getTestComponent(name);
}

export async function runTests() {
  await testRunner.runTests();
}

export async function wait(delay: number) {
  return testRunner.wait(delay);
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const testRunnerNotifyFn = testRunner.notify;
export function notify(name: string) {
  'worklet';
  return testRunnerNotifyFn(name);
}

export async function waitForNotify(name: string) {
  return testRunner.waitForNotify(name);
}

export function expect(value: TestValue) {
  return testRunner.expect(value);
}

export function expectNullable(currentValue: NullableTestValue) {
  return testRunner.expectNullable(currentValue);
}

export function expectNotNullable(currentValue: NullableTestValue) {
  return testRunner.expectNotNullable(currentValue);
}

export function configure(config: TestConfiguration) {
  return testRunner.configure(config);
}

export async function mockAnimationTimer() {
  await testRunner.mockAnimationTimer();
}

export async function unmockAnimationTimer() {
  await testRunner.unmockAnimationTimer();
}

export async function setAnimationTimestamp(timestamp: number) {
  await testRunner.setAnimationTimestamp(timestamp);
}

export async function advanceAnimationByTime(time: number) {
  await testRunner.advanceAnimationByTime(time);
}

export async function advanceAnimationByFrames(frameCount: number) {
  await testRunner.advanceAnimationByFrames(frameCount);
}

export async function recordAnimationUpdates() {
  return testRunner.recordAnimationUpdates();
}

export async function stopRecordingAnimationUpdates() {
  await testRunner.stopRecordingAnimationUpdates();
}
