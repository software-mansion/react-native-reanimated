import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';

import {
  expect,
  expectEventually,
  getTestComponent,
} from '../../../ReJest/RuntimeTestsApi';
import type { MountedViewProps } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

export async function createFadeTrace() {
  const rawSource = makeMutable<SharedValue<number> | null>(null);
  const state = makeMutable({
    running: true,
    tags: {} as Record<string, number>,
    frames: [] as FadeFrame[],
    events: [] as FadeEvent[],
    rawWriteIndex: 0,
  });

  await runOnUIBlocking(() => {
    'worklet';
    const record = (timestamp: number) => {
      if (!state.value.running) return;
      const { tags, frames } = state.value;
      const rawOpacity = rawSource.value?.value ?? 0.8;
      const views: Record<string, MountedViewProps | null> = {};
      for (const name in tags) {
        views[name] = global._obtainMountedViewProps(tags[name], true);
      }
      const reference = views.reference;
      state.value = {
        ...state.value,
        frames: [
          ...frames,
          {
            timestamp,
            realTimestamp: performance.now(),
            animationTimestamp: global._getAnimationTimestamp(),
            tags,
            views,
            rawOpacity,
            rawWriteIndex: state.value.rawWriteIndex,
            referenceFade: reference ? reference.opacity / 0.8 : null,
          },
        ].slice(-600),
      };
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });

  function register(name: string, tag: number) {
    if (tag < 0) return;
    runOnUISync(() => {
      'worklet';
      if (state.value.tags[name] !== undefined) return;
      state.value = {
        ...state.value,
        tags: { ...state.value.tags, [name]: tag },
      };
    });
  }

  function registerRefs(names: string[]) {
    for (const name of names) {
      try {
        register(name, getTestComponent(name).getTag());
      } catch {
        // The Insert case registers its child when the ref mounts.
      }
    }
  }

  function mark(id: string) {
    return runOnUIBlocking(() => {
      'worklet';
      const views: Record<string, MountedViewProps | null> = {};
      for (const name in state.value.tags) {
        views[name] = global._obtainMountedViewProps(
          state.value.tags[name],
          true
        );
      }
      const event = {
        id,
        realTimestamp: performance.now(),
        animationTimestamp: global._getAnimationTimestamp(),
        views,
      };
      state.value = { ...state.value, events: [...state.value.events, event] };
      return event;
    });
  }

  function read() {
    return runOnUISync(() => {
      'worklet';
      return state.value;
    });
  }

  function tags() {
    return runOnUISync(() => {
      'worklet';
      return state.value.tags;
    });
  }

  function frames() {
    return runOnUISync(() => {
      'worklet';
      return state.value.frames;
    });
  }

  function bindRawOpacity(source: SharedValue<number>) {
    runOnUISync(() => {
      'worklet';
      rawSource.value = source;
    });
  }

  function requireFrame(
    id: string,
    predicate: (frame: FadeFrame) => boolean,
    recordedFrames = frames()
  ) {
    const frame = recordedFrames.find(predicate);
    console.log(
      '[11033 assertion]',
      JSON.stringify({ id, value: !!frame, frame })
    );
    expect(!!frame).toBe(true);
  }

  async function assertion(
    id: string,
    predicate: () => boolean | Promise<boolean>
  ) {
    await mark(`${id}:start`);
    await expectEventually(async () => {
      const value = await predicate();
      console.log('[11033 assertion]', JSON.stringify({ id, value }));
      return value;
    }).toBe(true);
    await mark(`${id}:end`);
  }

  async function matchedSample<T>(
    id: string,
    sample: () => Promise<T>,
    matches: (value: T) => boolean
  ) {
    let matched: T | undefined;
    await assertion(id, async () => {
      const value = await sample();
      const result = matches(value);
      console.log(
        '[11033 predicate sample]',
        JSON.stringify({ id, value, result })
      );
      if (result) matched = value;
      return result;
    });
    return matched;
  }

  function stop() {
    runOnUISync(() => {
      'worklet';
      state.value = { ...state.value, running: false };
    });
    console.log('[11033 frame trace]', JSON.stringify(read()));
  }

  function onFinish(finished?: boolean) {
    'worklet';
    const views: Record<string, MountedViewProps | null> = {};
    for (const name in state.value.tags) {
      views[name] = global._obtainMountedViewProps(
        state.value.tags[name],
        true
      );
    }
    state.value = {
      ...state.value,
      events: [
        ...state.value.events,
        {
          id: `finish:${String(finished)}`,
          realTimestamp: performance.now(),
          animationTimestamp: global._getAnimationTimestamp(),
          views,
        },
      ],
    };
  }

  return {
    state,
    register,
    registerRefs,
    mark,
    tags,
    frames,
    assertion,
    stop,
    onFinish,
    bindRawOpacity,
    requireFrame,
    matchedSample,
  };
}

export type FadeTrace = Awaited<ReturnType<typeof createFadeTrace>>;

export type FadeFrame = {
  timestamp: number;
  realTimestamp: number;
  animationTimestamp: number;
  tags: Record<string, number>;
  views: Record<string, MountedViewProps | null>;
  rawOpacity: number;
  rawWriteIndex: number;
  referenceFade: number | null;
};

type FadeEvent = {
  id: string;
  realTimestamp: number;
  animationTimestamp: number;
  views: Record<string, MountedViewProps | null>;
};
