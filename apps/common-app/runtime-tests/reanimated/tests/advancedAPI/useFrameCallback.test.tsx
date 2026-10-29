import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { FrameCallback, FrameInfo } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getSharedValue,
  mockAnimationTimer,
  registerValue,
  render,
  test,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const MAX_LOG_LENGTH = 200;
const MAX_CALLS_PER_FRAME = 3;
const FRAME_DURATION = 16;

type FrameCallbackRegistry = {
  manageStateFrameCallback: (callbackId: number, state: boolean) => void;
};

const frameCallbacks: Record<string, FrameCallback> = {};

function logName(name: string) {
  return `${name}_log`;
}

function countName(name: string) {
  return `${name}_count`;
}

function maxCallsInFrameName(name: string) {
  return `${name}_maxCallsInFrame`;
}

async function getLog(name: string) {
  return (await getSharedValue<FrameInfo[]>(logName(name))) as FrameInfo[];
}

async function getCount(name: string) {
  return (await getSharedValue<number>(countName(name))) as number;
}

function FrameCallbackProbe({
  name,
  autostart = true,
}: {
  name: string;
  autostart?: boolean;
}) {
  const log = useSharedValue<FrameInfo[]>([]);
  const count = useSharedValue(0);
  registerValue(logName(name), log);
  registerValue(countName(name), count);

  frameCallbacks[name] = useFrameCallback((frameInfo) => {
    count.value += 1;
    if (log.value.length < MAX_LOG_LENGTH) {
      log.value = [...log.value, frameInfo];
    }
  }, autostart);

  return <View />;
}

function SelfTogglingProbe({ name }: { name: string }) {
  const log = useSharedValue<FrameInfo[]>([]);
  const count = useSharedValue(0);
  const maxCallsInFrame = useSharedValue(0);
  const callbackId = useSharedValue(-1);
  const lastTimestamp = useSharedValue(-1);
  const callsInFrame = useSharedValue(0);
  registerValue(logName(name), log);
  registerValue(countName(name), count);
  registerValue(maxCallsInFrameName(name), maxCallsInFrame);

  const frameCallback = useFrameCallback((frameInfo) => {
    count.value += 1;
    if (log.value.length < MAX_LOG_LENGTH) {
      log.value = [...log.value, frameInfo];
    }
    if (frameInfo.timestamp === lastTimestamp.value) {
      callsInFrame.value += 1;
    } else {
      lastTimestamp.value = frameInfo.timestamp;
      callsInFrame.value = 1;
    }
    if (callsInFrame.value > maxCallsInFrame.value) {
      maxCallsInFrame.value = callsInFrame.value;
    }
    if (callsInFrame.value > MAX_CALLS_PER_FRAME) {
      return;
    }
    if (callbackId.value === -1) {
      return;
    }
    const registry = (
      globalThis as unknown as { _frameCallbackRegistry: FrameCallbackRegistry }
    )._frameCallbackRegistry;
    registry.manageStateFrameCallback(callbackId.value, false);
    registry.manageStateFrameCallback(callbackId.value, true);
  });
  frameCallbacks[name] = frameCallback;

  useEffect(() => {
    callbackId.value = frameCallback.callbackId;
  }, [callbackId, frameCallback]);

  return <View />;
}

function expectFirstFrame(frameInfo: FrameInfo) {
  expect(frameInfo.timeSincePreviousFrame).toBeNullable();
  expect(frameInfo.timeSinceFirstFrame).toBe(0);
}

function expectConsistentFrames(log: FrameInfo[], from = 0) {
  for (let i = from + 1; i < log.length; i++) {
    const delta = log[i].timestamp - log[i - 1].timestamp;
    expect(delta > 0).toBe(true);
    expect(log[i].timeSincePreviousFrame).toBe(delta);
    expect(log[i].timeSinceFirstFrame).toBe(
      log[i].timestamp - log[from].timestamp
    );
  }
}

function expectMockedFrames(log: FrameInfo[], from = 0) {
  for (let i = from + 1; i < log.length; i++) {
    const index = i - from;
    expect(log[i].timeSincePreviousFrame).toBe(FRAME_DURATION);
    expect(log[i].timeSinceFirstFrame).toBe(FRAME_DURATION * index);
    expect(log[i].timestamp).toBe(log[from].timestamp + FRAME_DURATION * index);
  }
}

describe('Test *****useFrameCallback*****', () => {
  test('passes consistent FrameInfo values with the real timer', async () => {
    await render(<FrameCallbackProbe name="real" />);
    await waitForFrames(10);
    const log = await getLog('real');

    expect(log.length >= 5).toBe(true);
    expectFirstFrame(log[0]);
    expectConsistentFrames(log);
  });

  test('passes exact FrameInfo values with the mocked timer', async () => {
    await mockAnimationTimer();
    await render(<FrameCallbackProbe name="mocked" />);
    await waitForFrames(10);
    const log = await getLog('mocked');

    expect(log.length >= 5).toBe(true);
    expectFirstFrame(log[0]);
    expectMockedFrames(log);
  });

  test('setActive stops and resumes the callback and restarts timing', async () => {
    await mockAnimationTimer();
    await render(<FrameCallbackProbe name="toggle" />);
    const frameCallback = frameCallbacks.toggle;
    expect(frameCallback.isActive).toBe(true);
    await waitForFrames(5);

    frameCallback.setActive(false);
    expect(frameCallback.isActive).toBe(false);
    await waitForFrames(2);
    const countAfterStop = await getCount('toggle');
    expect(countAfterStop > 0).toBe(true);
    await waitForFrames(10);
    expect(await getCount('toggle')).toBe(countAfterStop);

    const resumeIndex = (await getLog('toggle')).length;
    frameCallback.setActive(true);
    expect(frameCallback.isActive).toBe(true);
    await waitForFrames(10);
    const log = await getLog('toggle');

    expect(log.length >= resumeIndex + 5).toBe(true);
    expectFirstFrame(log[resumeIndex]);
    expectMockedFrames(log, resumeIndex);
  });

  test('autostart = false does not run the callback until setActive(true)', async () => {
    await mockAnimationTimer();
    await render(<FrameCallbackProbe name="noAutostart" autostart={false} />);
    const frameCallback = frameCallbacks.noAutostart;
    expect(frameCallback.isActive).toBe(false);
    await waitForFrames(10);
    expect(await getCount('noAutostart')).toBe(0);

    frameCallback.setActive(true);
    expect(frameCallback.isActive).toBe(true);
    await expectEventually(
      async () => (await getCount('noAutostart')) >= 5
    ).toBe(true);
    const log = await getLog('noAutostart');

    expectFirstFrame(log[0]);
    expectMockedFrames(log);
  });

  test('unmount stops the callback', async () => {
    await render(<FrameCallbackProbe name="unmount" />);
    await waitForFrames(5);
    expect((await getCount('unmount')) > 0).toBe(true);

    await render(null);
    await waitForFrames(2);
    const countAfterUnmount = await getCount('unmount');
    await waitForFrames(10);

    expect(await getCount('unmount')).toBe(countAfterUnmount);
  });

  test('several callbacks each run once per frame', async () => {
    const names = ['first', 'second', 'third'];
    await render(
      <View>
        {names.map((name) => (
          <FrameCallbackProbe key={name} name={name} />
        ))}
      </View>
    );
    await waitForFrames(10);
    names.forEach((name) => frameCallbacks[name].setActive(false));
    await waitForFrames(2);

    const logs = await Promise.all(names.map((name) => getLog(name)));
    const counts = await Promise.all(names.map((name) => getCount(name)));

    expect(counts[0] >= 5).toBe(true);
    counts.forEach((count) => expect(count).toBe(counts[0]));
    logs.forEach((log) => {
      expectFirstFrame(log[0]);
      expectConsistentFrames(log);
      log.forEach((frameInfo, i) =>
        expect(frameInfo.timestamp).toBe(logs[0][i].timestamp)
      );
    });
  });

  test('a callback that deactivates and reactivates itself runs once per frame', async () => {
    await render(<SelfTogglingProbe name="selfToggle" />);
    await waitForFrames(10);
    frameCallbacks.selfToggle.setActive(false);
    await waitForFrames(2);
    const log = await getLog('selfToggle');

    const timestamps = log.map((frameInfo) => frameInfo.timestamp);

    expect(
      await getSharedValue<number>(maxCallsInFrameName('selfToggle'))
    ).toBe(1);
    expect(new Set(timestamps).size).toBe(timestamps.length);
    expect(new Set(timestamps).size >= 5).toBe(true);
  });
});
