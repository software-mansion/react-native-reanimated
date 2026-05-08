import {
  describe,
  test,
  beforeEach,
  afterEach,
  expect,
  notify,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';
import {
  runOnUISync,
  scheduleOnUI,
  scheduleOnRuntime,
  createWorkletRuntime,
  runOnRuntimeSync,
} from 'react-native-worklets';

declare global {
  var __reportFatalRemoteError: ((error: Error, _: boolean) => void) | undefined;
}

const originalReportFatalRemoteError = globalThis.__reportFatalRemoteError;

describe('Error traces from UI', () => {
  let errorData: Error | null = null;

  const testRuntime = createWorkletRuntime({
    name: 'testRuntime',
  });

  test('setup beforeEach and afterEach', () => {
    // TODO: there's a bug in ReJest and beforeEach/afterEach have to be
    // registered inside a test case.

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

    expect(errorData?.stack?.includes('at [UI]:')).toBe(true);
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
    expect(errorData?.stack?.includes('at [UI]:')).toBe(true);
    expect(errorData?.stack?.includes('at [UI]: functionNameA')).toBe(true);
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
    expect(errorData?.stack?.includes('at [testRuntime]:')).toBe(true);
    expect(errorData?.stack?.includes('at [testRuntime]: functionNameB')).toBe(true);
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
    expect(errorData?.stack?.includes('at [UI]:')).toBe(true);
    expect(errorData?.stack?.includes('at [UI]: functionNameC')).toBe(true);
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
    expect(errorData?.stack?.includes('at [testRuntime]:')).toBe(true);
    expect(errorData?.stack?.includes('at [testRuntime]: functionNameD')).toBe(true);
  });
});
