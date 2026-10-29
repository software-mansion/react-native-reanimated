'use strict';

import type { FrameCallbackRegistryUI } from '../src/frameCallback/FrameCallbackRegistryUI';
import { prepareUIRegistry } from '../src/frameCallback/FrameCallbackRegistryUI';

describe('FrameCallbackRegistryUI', () => {
  let frames: FrameRequestCallback[];
  let registry: FrameCallbackRegistryUI;
  let nextId: number;

  beforeEach(() => {
    frames = [];
    nextId = 0;
    jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
    prepareUIRegistry();
    runFrame(0);
    registry = global._frameCallbackRegistry;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function register(callback: () => void) {
    const id = nextId++;
    registry.registerFrameCallback(callback, id);
    return id;
  }

  function runFrame(timestamp: number) {
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback(timestamp));
  }

  test('calls a callback once per frame when it deactivates and reactivates itself', () => {
    let calls = 0;

    const id = register(() => {
      calls++;
      if (calls > 10) {
        throw new Error('[Reanimated] The callback ran more than 10 times.');
      }
      registry.manageStateFrameCallback(id, false);
      registry.manageStateFrameCallback(id, true);
    });
    registry.manageStateFrameCallback(id, true);
    runFrame(100);

    expect(calls).toBe(1);

    runFrame(116);

    expect(calls).toBe(2);
  });

  test('skips a callback that an earlier callback deactivates in the same frame', () => {
    const later = jest.fn();
    let laterId = -1;

    const earlierId = register(() => {
      registry.manageStateFrameCallback(laterId, false);
    });
    laterId = register(later);
    registry.manageStateFrameCallback(earlierId, true);
    registry.manageStateFrameCallback(laterId, true);
    runFrame(100);

    expect(later).not.toHaveBeenCalled();
  });

  test('skips a callback that an earlier callback unregisters in the same frame', () => {
    const later = jest.fn();
    let laterId = -1;

    const earlierId = register(() => {
      registry.unregisterFrameCallback(laterId);
    });
    laterId = register(later);
    registry.manageStateFrameCallback(earlierId, true);
    registry.manageStateFrameCallback(laterId, true);
    runFrame(100);

    expect(later).not.toHaveBeenCalled();
  });
});
