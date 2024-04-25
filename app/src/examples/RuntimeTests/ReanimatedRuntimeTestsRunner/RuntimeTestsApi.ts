import { Component, ReactElement } from 'react';
import { TestRunner } from './TestRunner';
import { TestComponent } from './TestComponent';
import type { SharedValue } from 'react-native-reanimated';
import { TestConfiguration, TestValue, NullableTestValue, DescribeDecorator, TestDecorator } from './types';

export { Presets } from './Presets';

const testRunner = new TestRunner();

export const describe = (name: string, buildSuite: () => void) => {
  testRunner.describe(name, buildSuite, null);
};

describe.skip = (name: string, buildSuite: () => void) => {
  testRunner.describe(name, buildSuite, DescribeDecorator.SKIP);
};

describe.only = (name: string, buildSuite: () => void) => {
  testRunner.describe(name, buildSuite, DescribeDecorator.ONLY);
};

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

export const test = (name: string, testCase: () => void) => {
  testRunner.test(name, testCase, null);
};

const failingDecorator = (name: string, warningMessage: string, testCase: () => void) => {
  testRunner.test(name, testCase, TestDecorator.FAILING, warningMessage);
};

failingDecorator.each = <T>(examples: Array<T>) => {
  return testRunner.testEachErrorMsg(examples, TestDecorator.FAILING);
};

const warnDecorator = (name: string, expectedWarning: string, testCase: () => void) => {
  testRunner.test(name, testCase, TestDecorator.WARN);
};

warnDecorator.each = <T>(examples: Array<T>) => {
  return testRunner.testEachErrorMsg(examples, TestDecorator.WARN);
};

test.warn = warnDecorator;

test.failing = failingDecorator;

test.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples, null);
};

const onlyDecorator = (name: string, testCase: () => void) => {
  testRunner.test(name, testCase, TestDecorator.ONLY);
};

onlyDecorator.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples, null);
};
test.only = onlyDecorator;

const skipDecorator = (name: string, testCase: () => void) => {
  testRunner.test(name, testCase, TestDecorator.SKIP);
};

skipDecorator.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples, TestDecorator.SKIP);
};

test.skip = skipDecorator;

export async function render(component: ReactElement<Component> | null) {
  return testRunner.render(component);
}

export async function clearRenderOutput() {
  return testRunner.clearRenderOutput();
}

export function useTestRef(name: string) {
  return testRunner.useTestRef(name);
}

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

const testRunnerNotifyFn = testRunner.notify;
export async function notify(name: string) {
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
  testRunner.stopRecordingAnimationUpdates();
}
