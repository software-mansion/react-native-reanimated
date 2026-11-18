import { logger } from '../src/common';
import { runOnJS, runOnUI } from '../src/workletFunctions';

describe('runOnUI on web', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('runs the worklet in the next animation frame, not in a microtask', async () => {
    const worklet = jest.fn();

    runOnUI(worklet)(1, 2);
    await Promise.resolve();
    await Promise.resolve();

    expect(worklet).not.toHaveBeenCalled();

    jest.advanceTimersByTime(16);

    expect(worklet).toHaveBeenCalledWith(1, 2);
  });

  test('runs a later queued microtask before the worklet', async () => {
    const calls: string[] = [];

    runOnUI(() => calls.push('worklet'))();
    queueMicrotask(() => calls.push('microtask'));
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(16);

    expect(calls).toEqual(['microtask', 'worklet']);
  });

  test('keeps the call order of several worklets in one frame', async () => {
    const calls: string[] = [];

    runOnUI(() => calls.push('first'))();
    runOnUI(() => calls.push('second'))();
    await Promise.resolve();
    jest.advanceTimersByTime(16);

    expect(calls).toEqual(['first', 'second']);
  });

  test('runs the worklets queued in one task in a single animation frame callback', async () => {
    const requestAnimationFrameSpy = jest.spyOn(
      globalThis,
      'requestAnimationFrame'
    );

    runOnUI(jest.fn())();
    runOnUI(jest.fn())();
    runOnUI(jest.fn())();
    await Promise.resolve();

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    requestAnimationFrameSpy.mockRestore();
  });

  test('runs the next queued worklet before a runOnJS callback from the previous one', async () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback) => frameCallbacks.push(callback));
    let value = 0;
    const calls: string[] = [];

    runOnUI(() => {
      calls.push('UI A');
      runOnJS(() => {
        value = 1;
        calls.push('JS from A');
      })();
    })();
    runOnUI(() => calls.push(`UI B saw ${value}`))();
    await Promise.resolve();
    for (const callback of frameCallbacks.splice(0)) {
      callback(0);
      await Promise.resolve();
    }

    expect(calls).toEqual(['UI A', 'UI B saw 0', 'JS from A']);
    requestAnimationFrameSpy.mockRestore();
  });

  test('runs a worklet queued by another worklet in a later frame', async () => {
    const calls: string[] = [];

    runOnUI(() => {
      calls.push('outer');
      runOnUI(() => calls.push('inner'))();
    })();
    await Promise.resolve();
    jest.advanceTimersByTime(16);
    await Promise.resolve();

    expect(calls).toEqual(['outer']);

    jest.advanceTimersByTime(16);

    expect(calls).toEqual(['outer', 'inner']);
  });

  test('keeps running the queued worklets when one of them throws', async () => {
    const loggerErrorSpy = jest
      .spyOn(logger, 'error')
      .mockReturnValue(undefined);
    const calls: string[] = [];

    runOnUI(() => {
      throw new Error('[Reanimated] worklet failed');
    })();
    runOnUI(() => calls.push('second'))();
    await Promise.resolve();
    jest.advanceTimersByTime(16);

    expect(calls).toEqual(['second']);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('worklet failed')
    );
    loggerErrorSpy.mockRestore();
  });
});
