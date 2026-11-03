/*
 * The bounded lifecycle stress set of the native layout route. Each path runs
 * its cycle `STRESS_CYCLES` times. After each cycle: one result for each
 * command, the expected callbacks one time each, no result or callback in the
 * frames after the end, and each view that stays at rest with no playback and
 * no later model write. After the path: no container of the retained state
 * grew.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';
import {
  commandsWithoutOneResult,
  growthOf,
  restStateOf,
  settledRead,
  takeTraceUntilCommandsEnd,
} from './nativeLayoutLifecycleKit';
import type { TraceEvent } from './nativeLayoutTestKit';
import {
  callbacks,
  ClippingScrollView,
  CLIPPED_OFFSET,
  DURATION,
  END_LEFT,
  entryExitOf,
  hasNativeLayoutRoute,
  isHostEvent,
  layoutOf,
  movingGeometryTest,
  scrollClippingViewTo,
  START_LEFT,
  summarize,
  takeTrace,
  takeTraceUntilSurfaceClosed,
  waitForCallbacks,
} from './nativeLayoutTestKit';

const STRESS_CYCLES = 10;

type CycleResult = {
  /** Each callback of the cycle, as `<name>:<finished>`. */
  expectedCallbacks: string[];
  /** A view that stays after the cycle, with the targets of its tracks. */
  staying?: { tag: number; targets: string[] };
  /** The trace that the cycle took. */
  events?: TraceEvent[];
};

describe('native layout stress', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest('start', async () => {
    await runPath('start', <StressScene layout={START_MOVE} />, (cycle) => {
      setStressLeft(leftOfCycle(cycle));
      return {
        expectedCallbacks: ['start:true'],
        staying: stayingBox(['PositionX']),
      };
    });
  });

  movingGeometryTest('replacement', async () => {
    await runPath(
      'replacement',
      <StressScene layout={REPLACED_MOVE} />,
      async (cycle) => {
        setStressLeft(leftOfCycle(cycle));
        await waitForFrames(REPLACEMENT_FRAMES);
        setStressLeft(MIDDLE_LEFT);
        return {
          expectedCallbacks: ['replaced:false', 'replaced:true'],
          staying: stayingBox(['PositionX']),
        };
      }
    );
  });

  movingGeometryTest('cancellation by a frame-driven start', async () => {
    await runPath(
      'cancellation',
      <StressScene layout={CANCELLED_MOVE} />,
      async () => {
        setStressLeft(END_LEFT);
        await wait(DURATION / 2);
        setStressBox({ left: START_LEFT, layout: CANCELLING_SPRING });
        await waitForCallbacks(['cancelling:true']);
        setStressBox({ left: START_LEFT, layout: CANCELLED_MOVE });
        return {
          expectedCallbacks: ['cancelled:false', 'cancelling:true'],
          staying: stayingBox(['PositionX']),
        };
      }
    );
  });

  movingGeometryTest('transfer out of the window and back', async () => {
    await runPath('transfer', <ClippedStressScene />, async (cycle) => {
      setStressLeft(leftOfCycle(cycle));
      await wait(0.3 * TRANSFER_MS);
      scrollClippingViewTo(CLIPPED_OFFSET);
      await wait(0.3 * TRANSFER_MS);
      scrollClippingViewTo(0);
      return {
        expectedCallbacks: ['transfer:true'],
        staying: stayingBox(['PositionX']),
      };
    });
  });

  movingGeometryTest('removal during a native move', async () => {
    await runPath(
      'removal',
      <StressScene layout={REMOVED_MOVE} />,
      async () => {
        setStressBox({
          left: START_LEFT,
          layout: REMOVED_MOVE,
          isMounted: true,
        });
        await waitForFrames(MOUNT_FRAMES);
        setStressLeft(END_LEFT);
        await wait(DURATION / 3);
        setStressBox({
          left: START_LEFT,
          layout: REMOVED_MOVE,
          isMounted: false,
        });
        return { expectedCallbacks: ['removed:false'] };
      }
    );
  });

  test('removal with a native exit', async () => {
    await runPath('exit', <StressScene layout={START_MOVE} />, async () => {
      setStressBox({ left: START_LEFT, exiting: STRESS_EXIT, isMounted: true });
      await waitForFrames(MOUNT_FRAMES);
      setStressBox({
        left: START_LEFT,
        exiting: STRESS_EXIT,
        isMounted: false,
      });
      return { expectedCallbacks: ['exit:true'] };
    });
  });

  if (isSecondSurfaceAvailable()) {
    movingGeometryTest('stop of a surface during a native move', async () => {
      await runPath('surface', null, async () => {
        const surfaceId = await startSecondSurface(SurfaceStressScene);
        await waitForFrames(MOUNT_FRAMES);
        setStressLeft(END_LEFT);
        await wait(DURATION / 3);
        await stopSecondSurface(surfaceId);
        return {
          expectedCallbacks: ['surface:false'],
          events: await takeTraceUntilSurfaceClosed(surfaceId),
        };
      });
    });
  }
});

const MIDDLE_LEFT = (START_LEFT + END_LEFT) / 2;
const REPLACEMENT_FRAMES = 3;
const MOUNT_FRAMES = 3;
const LATE_FRAMES = 20;
const TRANSFER_MS = 4 * DURATION;
const STRESS_REF = 'NativeLayoutStressBox';

const leftOfCycle = (cycle: number) =>
  cycle % 2 === 0 ? END_LEFT : START_LEFT;

const START_MOVE = layoutOf({ originX: {} }, { name: 'start' });
const REPLACED_MOVE = layoutOf(
  { originX: { duration: 2 * DURATION } },
  { name: 'replaced' }
);
const CANCELLED_MOVE = layoutOf({ originX: {} }, { name: 'cancelled' });
const CANCELLING_SPRING = layoutOf(
  { originX: { isFrameDrivenSpring: true } },
  { name: 'cancelling' }
);
const TRANSFER_MOVE = layoutOf(
  { originX: { duration: TRANSFER_MS } },
  { name: 'transfer' }
);
const REMOVED_MOVE = layoutOf({ originX: {} }, { name: 'removed' });
const STRESS_EXIT = entryExitOf(
  { opacity: { initial: 1, to: 0 } },
  { name: 'exit' }
);
const SURFACE_MOVE = layoutOf(
  { originX: { duration: 2 * DURATION } },
  { name: 'surface' }
);

const stayingBox = (targets: string[]) => ({
  tag: getTestComponent(STRESS_REF).getTag(),
  targets,
});

async function runPath(
  path: string,
  scene: Parameters<typeof render>[0],
  runCycle: (cycle: number) => CycleResult | Promise<CycleResult>
) {
  const before = await settledRead(`stress ${path}`, 'before');
  if (scene) {
    await render(scene);
    await wait(300);
  }
  const failures: string[] = [];
  const results: Record<string, number> = {};
  for (let cycle = 0; cycle < STRESS_CYCLES; cycle++) {
    await takeTrace();
    callbacks.length = 0;
    const {
      expectedCallbacks,
      staying,
      events: cycleEvents = [],
    } = await runCycle(cycle);
    const missing = await waitForCallbacks(expectedCallbacks, 4 * TRANSFER_MS);
    const events = await takeTraceUntilCommandsEnd(cycleEvents);
    for (const { outcome, reason } of events.filter(isHostResult)) {
      const result = `${outcome}:${reason}`;
      results[result] = (results[result] ?? 0) + 1;
    }
    await waitForFrames(LATE_FRAMES);
    const late = (await takeTrace()).filter(isResult);
    const problems = [
      missing && `missing callbacks ${missing}`,
      commandsWithoutOneResult(events.filter(isHostEvent)),
      late.length > 0 && `results after the end ${summarize(late)}`,
      [...callbacks].sort().join() !== [...expectedCallbacks].sort().join() &&
        `callbacks ${callbacks.join()}`,
      staying && (await restStateOf(staying.tag, staying.targets)),
    ].filter(Boolean);
    if (problems.length > 0) {
      failures.push(`cycle ${cycle}: ${problems.join('; ')}`);
    }
  }
  const after = await settledRead(`stress ${path}`, 'after');
  console.log(
    `LIFECYCLE-STRESS | ${path} | cycles ${STRESS_CYCLES} | results ${JSON.stringify(results)} | failed cycles ${failures.length} | ${failures.join(' | ')}`
  );
  expect(failures.join(' | ')).toBe('');
  expect(growthOf(before, after)).toBe('');
}

const isHostResult = ({ event }: TraceEvent) => event === 'Ended';

const isResult = ({ event }: TraceEvent) =>
  event === 'Ended' || event === 'TrackEnded' || event === 'ClientEnded';

type StressBox = {
  left: number;
  layout?: React.ComponentProps<typeof Animated.View>['layout'];
  exiting?: React.ComponentProps<typeof Animated.View>['exiting'];
  isMounted?: boolean;
};

let setStressBox: (box: StressBox) => void = () => {};
let setStressLeft: (left: number) => void = () => {};

function useStressBox(initial: StressBox) {
  const [box, setBox] = useState(initial);
  setStressBox = setBox;
  setStressLeft = (left) => setBox((current) => ({ ...current, left }));
  return box;
}

function StressScene({ layout }: Pick<StressBox, 'layout'>) {
  const box = useStressBox({ left: START_LEFT, layout });
  return (
    <View style={stressStyles.scene}>
      <StressBoxView {...box} />
    </View>
  );
}

function ClippedStressScene() {
  const box = useStressBox({ left: START_LEFT, layout: TRANSFER_MOVE });
  return (
    <ClippingScrollView style={stressStyles.scroll}>
      <StressBoxView {...box} />
      <View style={stressStyles.scrollFiller} />
    </ClippingScrollView>
  );
}

function SurfaceStressScene() {
  const box = useStressBox({ left: START_LEFT, layout: SURFACE_MOVE });
  return <StressBoxView {...box} />;
}

function StressBoxView({ left, layout, exiting, isMounted = true }: StressBox) {
  const ref = useTestRef(STRESS_REF);
  if (!isMounted) {
    return null;
  }
  return (
    <Animated.View
      ref={ref}
      layout={layout}
      exiting={exiting}
      style={[stressStyles.box, { marginLeft: left }]}
    />
  );
}

const stressStyles = StyleSheet.create({
  scene: {
    width: 300,
    height: 120,
  },
  box: {
    width: 30,
    height: 30,
    backgroundColor: 'teal',
  },
  scroll: {
    height: 200,
  },
  scrollFiller: {
    height: 3000,
  },
});
