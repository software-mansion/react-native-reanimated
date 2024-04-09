import { Component, ReactElement } from 'react';
import { TestRunner } from './TestRunner';
import { TestComponent } from './TestComponent';
import type { SharedValue } from 'react-native-reanimated';
import { TestConfiguration, TestValue } from './types';

export { Presets } from './Presets';

const testRunner = new TestRunner();

export function describe(name: string, buildSuite: () => void) {
  testRunner.describe(name, buildSuite);
}

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

function formatString(template: string, variableObject: unknown, index: number) {
  const valueToString: (arg0: unknown) => string = (value: unknown) => {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'function') {
      return value.name;
    }
    return value?.toString() || '';
  };
  let testName = template;

  testName = testName.replace(/%#/g, index.toString());

  if (variableObject === null) {
    return testName;
  }
  if (Array.isArray(variableObject)) {
    variableObject.forEach((value, index) => {
      // python-like syntax ${1} {2}
      testName = testName.replace('${' + index + '}', valueToString(value));
    });
  }
  if (typeof variableObject === 'object') {
    const keys = Object.keys(variableObject);
    keys.forEach(k => {
      // Typical object literal syntax
      testName = testName.replace('${' + k + '}', valueToString(variableObject[k as keyof typeof variableObject]));
    });
  }

  // Allow printf formatting used in jest
  testName = testName.replace(/%(p|s|i|f)/, valueToString(variableObject));

  return testName;
}

test.each = <T>(examples: Array<T>) => {
  return (name: string, testCase: (example: T) => void) => {
    examples.forEach((example, index) => {
      const currentTestCase = async () => {
        await testCase(example);
      };
      testRunner.test(formatString(name, example, index), currentTestCase);
    });
  };
};

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
