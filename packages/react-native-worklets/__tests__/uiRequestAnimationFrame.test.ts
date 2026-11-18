import { setupRequestAnimationFrame } from '../src/runLoop/uiRuntime/requestAnimationFrame';

const GLOBALS = [
  '__nativeRequestAnimationFrame',
  '__drainMicrotasks',
  '__flushAnimationFrame',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestAnimationFrameFinalizer',
  'queueMicrotask',
] as const;

describe('setupRequestAnimationFrame on the UI runtime', () => {
  const savedGlobals: Record<string, unknown> = {};
  let pendingNativeFrames: ((timestamp: number) => void)[];
  let enqueuedMicrotasks: (() => void)[];
  let timestamp: number;

  function runNativeFrame() {
    const frames = pendingNativeFrames;
    pendingNativeFrames = [];
    timestamp += 16;
    for (const frame of frames) {
      frame(timestamp);
    }
  }

  beforeEach(() => {
    for (const name of GLOBALS) {
      savedGlobals[name] = globalThis[name];
    }
    pendingNativeFrames = [];
    enqueuedMicrotasks = [];
    timestamp = 0;
    globalThis.__nativeRequestAnimationFrame = (callback) => {
      pendingNativeFrames.push(callback);
    };
    globalThis.__drainMicrotasks = () => {
      const microtasks = enqueuedMicrotasks;
      enqueuedMicrotasks = [];
      for (const microtask of microtasks) {
        microtask();
      }
    };
    globalThis.queueMicrotask = (callback) => {
      enqueuedMicrotasks.push(callback);
    };
    setupRequestAnimationFrame();
  });

  afterEach(() => {
    for (const name of GLOBALS) {
      (globalThis as Record<string, unknown>)[name] = savedGlobals[name];
    }
  });

  test('stops requesting native frames when nothing is queued', () => {
    expect(pendingNativeFrames).toHaveLength(1);

    runNativeFrame();

    expect(pendingNativeFrames).toHaveLength(0);
  });

  test('requests one native frame for many callbacks', () => {
    runNativeFrame();
    const callback = jest.fn();

    requestAnimationFrame(callback);
    requestAnimationFrame(callback);

    expect(pendingNativeFrames).toHaveLength(1);
    runNativeFrame();
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(timestamp);
    expect(pendingNativeFrames).toHaveLength(0);
  });

  test('keeps requesting native frames while callbacks request frames', () => {
    runNativeFrame();
    let framesLeft = 3;
    const callback = jest.fn(() => {
      framesLeft -= 1;
      if (framesLeft > 0) {
        requestAnimationFrame(callback);
      }
    });

    requestAnimationFrame(callback);
    for (let frame = 0; frame < 3; frame++) {
      expect(pendingNativeFrames).toHaveLength(1);
      runNativeFrame();
    }

    expect(callback).toHaveBeenCalledTimes(3);
    expect(pendingNativeFrames).toHaveLength(0);
  });

  test('requests a native frame for a finalizer', () => {
    runNativeFrame();
    const finalizer = jest.fn();

    globalThis.requestAnimationFrameFinalizer(finalizer);

    expect(pendingNativeFrames).toHaveLength(1);
    runNativeFrame();
    expect(finalizer).toHaveBeenCalledTimes(1);
    expect(pendingNativeFrames).toHaveLength(0);
  });

  test('requests another native frame for a finalizer queued by a finalizer', () => {
    runNativeFrame();
    const secondFinalizer = jest.fn();

    globalThis.requestAnimationFrameFinalizer(() => {
      globalThis.requestAnimationFrameFinalizer(secondFinalizer);
    });
    runNativeFrame();

    expect(secondFinalizer).not.toHaveBeenCalled();
    expect(pendingNativeFrames).toHaveLength(1);
    runNativeFrame();
    expect(secondFinalizer).toHaveBeenCalledTimes(1);
  });

  test('requests a native frame that drains a queued microtask', () => {
    runNativeFrame();
    const microtask = jest.fn();

    queueMicrotask(microtask);

    expect(pendingNativeFrames).toHaveLength(1);
    runNativeFrame();
    expect(microtask).toHaveBeenCalledTimes(1);
  });

  test('stops requesting native frames after a cancelled callback', () => {
    runNativeFrame();
    const callback = jest.fn();

    const handle = requestAnimationFrame(callback);
    cancelAnimationFrame(handle);
    runNativeFrame();

    expect(callback).not.toHaveBeenCalled();
    expect(pendingNativeFrames).toHaveLength(0);
  });
});
