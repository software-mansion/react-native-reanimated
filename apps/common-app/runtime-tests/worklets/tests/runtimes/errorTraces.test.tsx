import {
  experimental_runOnRNSync,
  runOnUISync,
  scheduleOnUI,
  scheduleOnRuntime,
  runOnRuntimeSync,
  scheduleOnRN,
} from 'react-native-worklets';

import {
  describe,
  test,
  beforeEach,
  afterEach,
  expect,
  notify,
  waitForNotification,
  getWorkletRuntimesFromPool,
} from '../../../ReJest/RuntimeTestsApi';

declare global {
  var __reportFatalRemoteError:
    | ((error: Error, _: boolean) => void)
    | undefined;
}

const originalReportFatalRemoteError = globalThis.__reportFatalRemoteError;

describe('Error traces from UI', () => {
  let errorData: Error | null = null;

  const [testRuntime] = getWorkletRuntimesFromPool(1);

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
    expect(errorData?.stack).toInclude(`at [${testRuntime.name}]:`);
    expect(errorData?.stack).toInclude(
      `at [${testRuntime.name}]: functionNameB`
    );
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
    expect(errorData?.stack).toInclude(`at [${testRuntime.name}]:`);
    expect(errorData?.stack).toInclude(
      `at [${testRuntime.name}]: functionNameD`
    );
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

describe('Error traces from RN', () => {
  let errorData: Error | null = null;
  let caughtStack = '';

  const [testRuntime] = getWorkletRuntimesFromPool(1);

  beforeEach(() => {
    caughtStack = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    globalThis.__reportFatalRemoteError = (a: Error, _: boolean) => {
      errorData = a;
      notify('errorReported');
    };
  });

  afterEach(() => {
    globalThis.__reportFatalRemoteError = originalReportFatalRemoteError;
  });

  function functionNameRN() {
    throw new Error();
  }

  const reportCaughtStack = (stack: string) => {
    caughtStack = stack;
    notify('stackCaught');
  };

  test('scheduleOnRN from UI has good stack trace added', async () => {
    scheduleOnUI(function functionNameUICaller() {
      'worklet';
      scheduleOnRN(functionNameRN);
    });

    await waitForNotification('errorReported');
    expect(errorData?.stack).toInclude('at [RN]: functionNameRN');
    expect(errorData?.stack).toInclude('functionNameUICaller');
  });

  test('scheduleOnRN from a Worker Runtime has good stack trace added', async () => {
    scheduleOnRuntime(testRuntime, function functionNameWorkerCaller() {
      'worklet';
      scheduleOnRN(functionNameRN);
    });

    await waitForNotification('errorReported');
    expect(errorData?.stack).toInclude('at [RN]: functionNameRN');
    expect(errorData?.stack).toInclude('functionNameWorkerCaller');
  });

  test('experimental_runOnRNSync rethrows with the RN stack and the caller stack', async () => {
    scheduleOnUI(function functionNameSyncCaller() {
      'worklet';
      try {
        experimental_runOnRNSync(functionNameRN);
      } catch (error) {
        scheduleOnRN(reportCaughtStack, (error as Error).stack ?? '');
      }
    });

    await waitForNotification('stackCaught');
    expect(caughtStack).toInclude('at [RN]: functionNameRN');
    expect(caughtStack).toInclude('functionNameSyncCaller');
  });

  test('uncaught experimental_runOnRNSync error keeps RN frames and labels UI frames', async () => {
    scheduleOnUI(function functionNameUncaughtCaller() {
      'worklet';
      experimental_runOnRNSync(functionNameRN);
    });

    await waitForNotification('errorReported');
    expect(errorData?.stack).toInclude('at [RN]: functionNameRN');
    expect(errorData?.stack).toInclude('at [UI]: functionNameUncaughtCaller');
    expect(errorData?.stack).not.toInclude('[UI]: [RN]');
  });
});
