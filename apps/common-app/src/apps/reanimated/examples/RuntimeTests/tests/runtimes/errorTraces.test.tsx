import {
  describe,
  test,
  beforeEach,
  afterEach,
  expect,
  notify,
  waitForNotification,
  getWorkletRuntimeFromPool,
} from '../../ReJest/RuntimeTestsApi';
import {
  runOnUISync,
  scheduleOnUI,
  scheduleOnRuntime,
  runOnRuntimeSync,
  scheduleOnRN,
} from 'react-native-worklets';

declare global {
  var __reportFatalRemoteError:
    | ((error: Error, _: boolean) => void)
    | undefined;
}

const originalReportFatalRemoteError = globalThis.__reportFatalRemoteError;

describe('Error traces from UI', () => {
  let errorData: Error | null = null;

  const testRuntime = getWorkletRuntimeFromPool('test');

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    globalThis.__reportFatalRemoteError = (a: Error, _: boolean) => {
      errorData = a;
      notify('errorReported');
    };
  });

  afterEach(() => {
    globalThis.__reportFatalRemoteError = originalReportFatalRemoteError;
  });

  test('[UI] tag gets added to stack trace', () => {
    const badFn = (callback: () => void) => {
      'worklet';
      callback();
    };
    runOnUISync(badFn, () => {
      'worklet';
      throw new Error();
    });

    expect(errorData?.stack).toInclude('at [UI]:');
  });

  test('scheduleOnUI has good stack trace added', async () => {
    const badFn = (callback: () => void) => {
      'worklet';
      callback();
    };
    scheduleOnUI(badFn, function functionNameA() {
      'worklet';
      throw new Error();
    });

    await waitForNotification('errorReported');
    expect(errorData?.stack).toInclude('at [UI]:');
    expect(errorData?.stack).toInclude('at [UI]: functionNameA');
  });

  test('scheduleOnRuntime has good stack trace added', async () => {
    const badFn = (callback: () => void) => {
      'worklet';
      callback();
    };

    scheduleOnRuntime(testRuntime, badFn, function functionNameB() {
      'worklet';
      throw new Error();
    });

    await waitForNotification('errorReported');
    expect(errorData?.stack).toInclude('at [test]:');
    expect(errorData?.stack).toInclude('at [test]: functionNameB');
  });

  test('runOnUISync has good stack trace added', async () => {
    const badFn = (callback: () => void) => {
      'worklet';
      callback();
    };

    runOnUISync(badFn, function functionNameC() {
      'worklet';
      throw new Error();
    });

    await waitForNotification('errorReported');
    expect(errorData?.stack).toInclude('at [UI]:');
    expect(errorData?.stack).toInclude('at [UI]: functionNameC');
  });

  test('runOnRuntimeSync has good stack trace added', async () => {
    const badFn = (callback: () => void) => {
      'worklet';
      callback();
    };

    runOnRuntimeSync(testRuntime, badFn, function functionNameD() {
      'worklet';
      throw new Error();
    });

    await waitForNotification('errorReported');
    expect(errorData?.stack).toInclude('at [test]:');
    expect(errorData?.stack).toInclude('at [test]: functionNameD');
  });

  test('batched scheduleOnUI: throw in middle job does not break siblings, each job has its own stack', async () => {
    const notifyJob1Ran = () => notify('job1Ran');
    const notifyJob3Ran = () => notify('job3Ran');

    scheduleOnUI(function functionNameJob1() {
      'worklet';
      scheduleOnRN(notifyJob1Ran);
    });

    scheduleOnUI(function functionNameJob2() {
      'worklet';
      throw new Error();
    });

    scheduleOnUI(function functionNameJob3() {
      'worklet';
      scheduleOnRN(notifyJob3Ran);
    });

    await waitForNotification('errorReported');
    await waitForNotification('job1Ran');
    await waitForNotification('job3Ran');

    expect(errorData?.stack).toInclude('at [UI]: functionNameJob2');
    expect(errorData?.stack).not.toInclude('at [UI]: functionNameJob1');
    expect(errorData?.stack).not.toInclude('at [UI]: functionNameJob3');
  });
});
