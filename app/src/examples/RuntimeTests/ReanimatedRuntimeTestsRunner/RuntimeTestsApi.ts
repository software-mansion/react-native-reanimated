import { Component, ReactElement } from 'react';
import { TestRunner } from './TestRunner';
import { TestComponent } from './TestComponent';
import type { SharedValue } from 'react-native-reanimated';
import { TestConfiguration, TestValue } from './types';

export { Presets } from './Presets';

const testRunner = new TestRunner();

export const describe = (name: string, buildSuite: () => void) => {
  testRunner.describe(name, buildSuite);
};

describe.skip = (name: string, buildSuite: () => void) => {
  testRunner.describe(name, buildSuite, false, true);
};

describe.only = (name: string, buildSuite: () => void) => {
  testRunner.describe(name, buildSuite, true);
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
  testRunner.test(name, testCase);
};

const failingDecorator = (name: string, expectedWarning: string, testCase: () => void) => {
  testRunner.test(name, testCase, false, false, true, false, expectedWarning);
};

failingDecorator.each = <T>(examples: Array<T>) => {
  return testRunner.testEachErrorMsg(examples, false, false, true, false);
};

const warnDecorator = (name: string, expectedWarning: string, testCase: () => void) => {
  testRunner.test(name, testCase, false, false, false, true, expectedWarning);
};

warnDecorator.each = <T>(examples: Array<T>) => {
  return testRunner.testEachErrorMsg(examples, false, false, false, true);
};

test.warn = warnDecorator;

test.failing = failingDecorator;

test.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples);
};

const onlyDecorator = (name: string, testCase: () => void) => {
  testRunner.test(name, testCase, true);
};

onlyDecorator.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples, true);
};
test.only = onlyDecorator;

const skipDecorator = (name: string, testCase: () => void) => {
  testRunner.test(name, testCase, false, true);
};

skipDecorator.each = <T>(examples: Array<T>) => {
  return testRunner.testEach(examples, false, true);
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
