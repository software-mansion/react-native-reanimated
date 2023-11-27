import { RUNTIME_TEST_ERRORS, TestRunner } from './TestRunner';
import { TestComponent } from './TestComponent';

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

export function test(name: string, testCase: () => void) {
  testRunner.test(name, testCase);
}

export async function render(component: any) {
  return testRunner.render(component);
}

export function useTestRef(name: string): React.MutableRefObject<any> {
  return testRunner.useTestRef(name);
}

export function getTestComponent(name: string): TestComponent {
  return testRunner.getTestComponent(name);
}

export async function runTests() {
  await testRunner.runTests();
}

export async function wait(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export function expect(value: any) {
  return testRunner.expect(value);
}

export function configure(config: any) {
  return testRunner.configure(config);
}

export async function mockAnimationTimer() {
  testRunner.mockAnimationTimer();
}

export async function unmockAnimationTimer() {
  testRunner.unmockAnimationTimer();
}

export async function setAnimationTimestamp(timestamp: number) {
  await testRunner.runOnUiSync(() => {
    'worklet';
    assertMockedAnimationTimestamp(global.mockedAnimationTimestamp);
    global.mockedAnimationTimestamp = timestamp;
  });
}

export async function advanceAnimationByTime(time: number) {
  await testRunner.runOnUiSync(() => {
    'worklet';
    assertMockedAnimationTimestamp(global.mockedAnimationTimestamp);
    global.mockedAnimationTimestamp += time;
  });
}

export async function advanceAnimationByFrames(frameCount: number) {
  await testRunner.runOnUiSync(() => {
    'worklet';
    assertMockedAnimationTimestamp(global.mockedAnimationTimestamp);
    global.mockedAnimationTimestamp += frameCount * 16;
  });
}

export async function recordAnimationUpdates(mergeOperations = true) {
  return testRunner.recordAnimationUpdates(mergeOperations);
}

export async function stopRecordingAnimationUpdates() {
  testRunner.stopRecordingAnimationUpdates();
}

function assertMockedAnimationTimestamp(
  timestamp: number | undefined
): asserts timestamp is number {
  if (timestamp === undefined) {
    console.error(RUNTIME_TEST_ERRORS.NO_MOCKED_TIMESTAMP);
  }
}
