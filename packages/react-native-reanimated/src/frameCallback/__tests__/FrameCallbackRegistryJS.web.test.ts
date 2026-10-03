'use strict';

import FrameCallbackRegistryJS from '../FrameCallbackRegistryJS';

describe('FrameCallbackRegistryJS (web)', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function runFrame(timestamp: number) {
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback(timestamp));
  }

  test('calls an active callback on every frame with frame info', () => {
    const registry = new FrameCallbackRegistryJS();
    const callback = jest.fn();

    const id = registry.registerFrameCallback(callback);
    registry.manageStateFrameCallback(id, true);
    runFrame(100);
    runFrame(116);
    runFrame(132);

    expect(callback.mock.calls).toEqual([
      [
        {
          timestamp: 100,
          timeSincePreviousFrame: null,
          timeSinceFirstFrame: 0,
        },
      ],
      [{ timestamp: 116, timeSincePreviousFrame: 16, timeSinceFirstFrame: 16 }],
      [{ timestamp: 132, timeSincePreviousFrame: 16, timeSinceFirstFrame: 32 }],
    ]);
  });

  test('does not call a registered callback until it is activated', () => {
    const registry = new FrameCallbackRegistryJS();
    const callback = jest.fn();

    registry.registerFrameCallback(callback);
    runFrame(100);

    expect(callback).not.toHaveBeenCalled();
    expect(frames).toHaveLength(0);
  });

  test('stops the loop when the last callback is deactivated', () => {
    const registry = new FrameCallbackRegistryJS();
    const callback = jest.fn();

    const id = registry.registerFrameCallback(callback);
    registry.manageStateFrameCallback(id, true);
    runFrame(100);
    registry.manageStateFrameCallback(id, false);
    runFrame(116);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
  });

  test('restarts timing when a callback is activated again', () => {
    const registry = new FrameCallbackRegistryJS();
    const callback = jest.fn();

    const id = registry.registerFrameCallback(callback);
    registry.manageStateFrameCallback(id, true);
    runFrame(100);
    registry.manageStateFrameCallback(id, false);
    runFrame(116);
    registry.manageStateFrameCallback(id, true);
    runFrame(200);

    expect(callback).toHaveBeenLastCalledWith({
      timestamp: 200,
      timeSincePreviousFrame: null,
      timeSinceFirstFrame: 0,
    });
  });

  test('does not call a callback after it is unregistered', () => {
    const registry = new FrameCallbackRegistryJS();
    const callback = jest.fn();

    const id = registry.registerFrameCallback(callback);
    registry.manageStateFrameCallback(id, true);
    registry.unregisterFrameCallback(id);
    runFrame(100);

    expect(callback).not.toHaveBeenCalled();
  });
});
