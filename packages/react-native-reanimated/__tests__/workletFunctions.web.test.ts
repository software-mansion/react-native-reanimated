import { runOnUI } from '../src/workletFunctions';

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
});
