/*
 * The retained state of the native layout route (I-33 to I-35). Each read before and after a case is at the
 * settle point: the commands and the tracks of the last cycle have their `Ended` and `TrackEnded` events, the
 * exiting views are not mounted, one trailing commit runs a pull, a garbage collection runs on Android (the
 * geometry writers are a map with weak keys), then two reads 5 display frames apart. Two
 * reads that differ are a test fault, not a result. A size that grows is a result. Each view that
 * stays has a native start before the first read, so the reads that a case compares are of one phase.
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion } from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import type { NativeAnimationContainerSizes } from '../nativeAnimationObservation';
import {
  containerSizes,
  pendingBuildCountOf,
} from '../nativeAnimationObservation';
import { collectGarbage } from '../viewSampler';
import type { TraceEvent } from './nativeLayoutTestKit';
import {
  END_LEFT,
  entryExitOf,
  FRAME_MS,
  hasNativeLayoutRoute,
  isNoView,
  layoutOf,
  movingGeometryTest,
  sample,
  START_LEFT,
  styles,
  takeTrace,
  takeTraceUntil,
} from './nativeLayoutTestKit';

export function describeRetainedState() {
  describe('native layout retained state', () => {
    if (!hasNativeLayoutRoute) {
      return;
    }

    movingGeometryTest(
      '100 start, cancel, and exit cycles bring each container and the build store back to its size before the cycles',
      async () => {
        const caseName = 'start, cancel, and exit cycles';
        const scene = sceneOf(CycleScene, { stayingLeft: START_LEFT });
        await scene.render({});
        const before = await settledRead(caseName, 'before', scene);

        const lastCycle = await runCycles(scene, SHORT_RUN_CYCLES, false);
        const after = await settledRead(caseName, 'after', scene, lastCycle);

        expect(growthOf(before, after)).toBe('');
        expect(after.pendingBuilds).toBe(0);
        await render(null);
      }
    );

    movingGeometryTest(
      'a partial replacement keeps one command until its kept track ends, then the sizes go back',
      async () => {
        const caseName = 'partial replacement';
        const scene = sceneOf(PartialReplacementScene, { left: START_LEFT });
        await scene.render({});
        const tag = getTestComponent(PARTIAL_REF).getTag();
        const partialViews: CycleViews = { commandTags: [tag], exitedTags: [] };
        await takeTrace();
        await scene.render({ left: END_LEFT });
        await wait(CYCLE_MS + END_MARGIN_MS);
        const before = await settledRead(
          caseName,
          'before',
          scene,
          partialViews
        );

        await scene.render({ left: MIDDLE_LEFT });
        await waitForFrames(REPLACEMENT_FRAMES);
        await scene.render({ left: START_LEFT });
        await waitForFrames(REPLACEMENT_FRAMES);
        const during = await readRetained();
        printRow(caseName, 'during', [during]);
        const after = await settledRead(caseName, 'after', scene, partialViews);

        expect(sizeChangeOf(before, during, HOST_COMMANDS)).toBe(2);
        expect(sizeChangeOf(before, during, LAYOUT_GROUPS)).toBe(1);
        expect(growthOf(before, after)).toBe('');
        await render(null);
      }
    );

    movingGeometryTest(
      'a refused build leaves no entry in the build store',
      async () => {
        const caseName = 'refused build';
        const scene = sceneOf(RefusedBuildScene, { left: START_LEFT });
        await scene.render({});
        const tag = getTestComponent(REFUSED_REF).getTag();
        const before = await settledRead(caseName, 'before', scene);

        await takeTrace();
        await scene.render({ left: END_LEFT });
        await wait(CYCLE_MS + END_MARGIN_MS);
        expect(hasBuildFailure(await takeTrace(), tag)).toBe(true);
        const after = await settledRead(caseName, 'after', scene);

        expect(after.pendingBuilds).toBe(before.pendingBuilds);
        await render(null);
      }
    );
  });
}

export function describeRetainedStateOnLongLivedSurface() {
  describe('native layout retained state, long-lived surface', () => {
    if (!hasNativeLayoutRoute) {
      return;
    }

    movingGeometryTest(
      '1000 cycles on one surface keep each container at its size before the cycles',
      async () => {
        const caseName = 'long-lived surface';
        const scene = sceneOf(CycleScene, { stayingLeft: START_LEFT });
        await scene.render({});
        const stayingTag = getTestComponent(STAYING_REF).getTag();
        const readCheckpoint = (point: string, lastCycle?: CycleViews) =>
          settledRead(caseName, point, scene, lastCycle, stayingTag);
        const firstCycle = await runCycles(scene, 1, true);
        const checkpoints = [await readCheckpoint('cycle 1', firstCycle)];

        for (
          let cycles = 1 + CHECKPOINT_CYCLES;
          cycles <= 1 + LONG_RUN_CYCLES;
          cycles += CHECKPOINT_CYCLES
        ) {
          const lastCycle = await runCycles(scene, CHECKPOINT_CYCLES, true);
          checkpoints.push(await readCheckpoint(`cycle ${cycles}`, lastCycle));
        }

        expect(
          growthOf(checkpoints[0], checkpoints[checkpoints.length - 1])
        ).toBe('');
        await render(null);
      }
    );
  });
}

const CYCLE_MS = 100;
const END_MARGIN_MS = 4 * FRAME_MS;
const MIDDLE_LEFT = (START_LEFT + END_LEFT) / 2;
const REPLACEMENT_FRAMES = 3;
const SHORT_RUN_CYCLES = 100;
const LONG_RUN_CYCLES = 1000;
const CHECKPOINT_CYCLES = 100;
/** The recorder keeps the newest 1024 events (H-06). */
const TRACE_TAKE_CYCLES = 10;
const SETTLE_FRAMES = 10;
const READ_GAP_FRAMES = 5;
const REMOVAL_FRAMES = 60;
const KEPT_TRACK_MS = 6 * CYCLE_MS;
const PARTIAL_START_OPACITY = 0.2;
const SETTLE_COLORS = ['white', 'whitesmoke'];
const STAYING_TARGETS = ['PositionX', 'PositionY', 'Opacity'];
const HOST_COMMANDS = 'host.commands';
const LAYOUT_GROUPS = 'registry.proxies.nativeLayoutGroups.groups';

const STAYING_REF = 'NativeLayoutRetainedStayingBox';
const CYCLING_REF = 'NativeLayoutRetainedCyclingBox';
const PARTIAL_REF = 'NativeLayoutRetainedPartialBox';
const REFUSED_REF = 'NativeLayoutRetainedRefusedBox';

const CYCLE_MOVE = layoutOf({ originX: { duration: CYCLE_MS } });
const CYCLE_ENTERING = entryExitOf({
  opacity: { initial: 0, to: 1, duration: CYCLE_MS },
});
const CYCLE_EXITING = entryExitOf({
  opacity: { initial: 1, to: 0, duration: CYCLE_MS },
});
/**
 * A second move keeps the end value of the opacity leaf, so the opacity track
 * of the first move continues and only its X track has a replacement.
 */
const PARTIAL_MOVE = layoutOf({
  originX: { duration: CYCLE_MS },
  opacity: { initial: PARTIAL_START_OPACITY, to: 1, duration: KEPT_TRACK_MS },
});
const REFUSED_MOVE = layoutOf({
  originX: { duration: CYCLE_MS, reduceMotion: ReduceMotion.Always },
});

type RetainedRead = {
  sizes: NativeAnimationContainerSizes;
  pendingBuilds: number;
};

/** The views of the last cycle before a read. */
type CycleViews = { commandTags: number[]; exitedTags: number[] };

type SettleProps = { settleColor: string };

type Scene<TProps> = {
  render: (change: Partial<TProps>) => Promise<void>;
  renderTrailingCommit: () => Promise<void>;
};

function sceneOf<TProps extends object>(
  Component: React.ComponentType<TProps & SettleProps>,
  initialProps: TProps
): Scene<TProps> {
  let props = initialProps;
  let colorIndex = 0;
  const renderScene = () =>
    render(<Component {...props} settleColor={SETTLE_COLORS[colorIndex]} />);
  return {
    render: (change) => {
      props = { ...props, ...change };
      return renderScene();
    },
    renderTrailingCommit: () => {
      colorIndex = (colorIndex + 1) % SETTLE_COLORS.length;
      return renderScene();
    },
  };
}

type CycleProps = { stayingLeft: number; cyclingLeft?: number };

async function runCycles(
  scene: Scene<CycleProps>,
  count: number,
  movesStayingBox: boolean
): Promise<CycleViews> {
  const stayingTag = getTestComponent(STAYING_REF).getTag();
  let cyclingTag = 0;
  for (let cycle = 0; cycle < count; cycle++) {
    if (cycle % TRACE_TAKE_CYCLES === 0 || cycle === count - 1) {
      await takeTrace();
    }
    cyclingTag = await runCycle(scene, movesStayingBox ? cycle : undefined);
  }
  return {
    commandTags: movesStayingBox ? [cyclingTag, stayingTag] : [cyclingTag],
    exitedTags: [cyclingTag],
  };
}

/**
 * A native entering, a native move that a second move replaces before its end,
 * and a native exit of one view. `stayingCycle` moves the view that stays in
 * the same way.
 */
async function runCycle(scene: Scene<CycleProps>, stayingCycle?: number) {
  const stayingEnd =
    stayingCycle !== undefined && stayingCycle % 2 === 0
      ? END_LEFT
      : START_LEFT;
  const stayingMiddle =
    stayingCycle === undefined ? {} : { stayingLeft: MIDDLE_LEFT };
  const stayingAtEnd =
    stayingCycle === undefined ? {} : { stayingLeft: stayingEnd };

  await scene.render({ cyclingLeft: START_LEFT });
  const cyclingTag = getTestComponent(CYCLING_REF).getTag();
  await wait(CYCLE_MS + END_MARGIN_MS);
  await scene.render({ cyclingLeft: MIDDLE_LEFT, ...stayingMiddle });
  await waitForFrames(REPLACEMENT_FRAMES);
  await scene.render({ cyclingLeft: END_LEFT, ...stayingAtEnd });
  await wait(CYCLE_MS + END_MARGIN_MS);
  await scene.render({ cyclingLeft: undefined });
  await wait(CYCLE_MS + END_MARGIN_MS);
  return cyclingTag;
}

async function settledRead<TProps>(
  caseName: string,
  point: string,
  scene: Scene<TProps>,
  lastCycle: CycleViews = { commandTags: [], exitedTags: [] },
  stayingTag?: number
): Promise<RetainedRead> {
  await waitForEndedCommands(lastCycle.commandTags);
  for (const tag of lastCycle.exitedTags) {
    await waitForRemoval(tag);
  }
  await scene.renderTrailingCommit();
  if (Platform.OS === 'android') {
    await collectGarbage();
  }
  await waitForFrames(SETTLE_FRAMES);
  const first = await readRetained();
  await waitForFrames(READ_GAP_FRAMES);
  const second = await readRetained();
  const members =
    stayingTag === undefined ? undefined : await membersOf(stayingTag);
  printRow(caseName, point, [first, second], members);
  const instability = differencesOf(first, second);
  if (instability !== '') {
    throw new Error(
      `${caseName}, ${point}: the two reads of the settle point differ (${instability}). This is a test fault (failure class 4), and the case is not counted.`
    );
  }
  return first;
}

/**
 * The start and the end event of a command and of a track. A command that a
 * replacement interrupts ends before the tracks that the replacement keeps.
 */
const LIFETIMES = [
  {
    started: 'Received',
    ended: 'Ended',
    keyOf: ({ tag, generation }: TraceEvent) => `${tag}.${generation}`,
  },
  {
    started: 'TrackStarted',
    ended: 'TrackEnded',
    keyOf: ({ tag, generation, target }: TraceEvent) =>
      `${target} of ${tag}.${generation}`,
  },
];

async function waitForEndedCommands(tags: number[]) {
  const unendedOf = (events: TraceEvent[]) =>
    LIFETIMES.flatMap(({ started, ended, keyOf }) => {
      const keysOf = (event: string) =>
        new Set(
          events
            .filter(
              (traced) => traced.event === event && tags.includes(traced.tag)
            )
            .map(keyOf)
        );
      const endedKeys = keysOf(ended);
      return [...keysOf(started)].filter((key) => !endedKeys.has(key));
    });
  const events = await takeTraceUntil((taken) => unendedOf(taken).length === 0);
  const unended = unendedOf(events);
  if (unended.length > 0) {
    throw new Error(
      `The commands and tracks ${unended.join(', ')} have no end event in the trace.`
    );
  }
}

async function waitForRemoval(tag: number) {
  for (let frame = 0; frame < REMOVAL_FRAMES; frame++) {
    if (!(await hasView(tag))) {
      return;
    }
    await waitForFrames(1);
  }
  throw new Error(
    `The exiting view ${tag} is mounted ${REMOVAL_FRAMES} frames after its exit.`
  );
}

const hasView = (tag: number) =>
  sample(tag, 'Opacity').then(
    () => true,
    (error: unknown) => {
      if (isNoView(error)) {
        return false;
      }
      throw error;
    }
  );

async function readRetained(): Promise<RetainedRead> {
  const sizes = await containerSizes();
  return { sizes, pendingBuilds: pendingBuildCountOf() };
}

/** The number of physical animations of each target of the view (I-34). */
async function membersOf(tag: number) {
  const counts: Record<string, number> = {};
  for (const target of STAYING_TARGETS) {
    counts[target] = (await sample(tag, target)).members.length;
  }
  return counts;
}

/**
 * The sizes that grew from `before` to `after`: a size that falls keeps no
 * state.
 */
const growthOf = (before: RetainedRead, after: RetainedRead) =>
  differencesOf(before, after, (first, second) => second > first);

function differencesOf(
  first: RetainedRead,
  second: RetainedRead,
  isDifference = (firstSize: number, secondSize: number) =>
    firstSize !== secondSize
) {
  const names = new Set([
    ...Object.keys(first.sizes),
    ...Object.keys(second.sizes),
  ]);
  const differences = [...names]
    .sort()
    .filter((name) => isDifference(sizeOf(first, name), sizeOf(second, name)))
    .map((name) => `${name} ${sizeOf(first, name)} -> ${sizeOf(second, name)}`);
  if (isDifference(first.pendingBuilds, second.pendingBuilds)) {
    differences.push(
      `pendingBuilds ${first.pendingBuilds} -> ${second.pendingBuilds}`
    );
  }
  return differences.join(', ');
}

const sizeOf = ({ sizes }: RetainedRead, name: string) => sizes[name] ?? 0;

const sizeChangeOf = (
  before: RetainedRead,
  after: RetainedRead,
  name: string
) => sizeOf(after, name) - sizeOf(before, name);

function printRow(
  caseName: string,
  point: string,
  reads: RetainedRead[],
  members?: Record<string, number>
) {
  const readText = ({ sizes, pendingBuilds }: RetainedRead) =>
    [
      `pendingBuilds=${pendingBuilds}`,
      ...Object.keys(sizes)
        .sort()
        .map((name) => `${name}=${sizes[name]}`),
    ].join(' ');
  const memberText = members
    ? Object.entries(members)
        .map(([target, count]) => `${target}=${count}`)
        .join(' ')
    : '-';
  console.log(
    `RETAINED | ${caseName} | ${point} | ${reads.map(readText).join(' | ')} | members ${memberText}`
  );
}

const hasBuildFailure = (events: TraceEvent[], tag: number) =>
  events.some(
    (event) => event.event === 'LayoutBuildFailed' && event.tag === tag
  );

function SettleView({ settleColor }: SettleProps) {
  return (
    <View
      style={[retainedStyles.settleView, { backgroundColor: settleColor }]}
    />
  );
}

function CycleScene({
  stayingLeft,
  cyclingLeft,
  settleColor,
}: CycleProps & SettleProps) {
  return (
    <View style={styles.container}>
      <SettleView settleColor={settleColor} />
      <MovingBox refName={STAYING_REF} left={stayingLeft} />
      {cyclingLeft !== undefined && <CyclingBox left={cyclingLeft} />}
    </View>
  );
}

function MovingBox({ refName, left }: { refName: string; left: number }) {
  return (
    <Animated.View
      ref={useTestRef(refName)}
      layout={CYCLE_MOVE}
      style={[styles.box, { marginLeft: left }]}
    />
  );
}

function CyclingBox({ left }: { left: number }) {
  return (
    <Animated.View
      ref={useTestRef(CYCLING_REF)}
      entering={CYCLE_ENTERING}
      layout={CYCLE_MOVE}
      exiting={CYCLE_EXITING}
      style={[styles.box, { marginLeft: left }]}
    />
  );
}

function PartialReplacementScene({
  left,
  settleColor,
}: { left: number } & SettleProps) {
  return (
    <View style={styles.container}>
      <SettleView settleColor={settleColor} />
      <Animated.View
        ref={useTestRef(PARTIAL_REF)}
        layout={PARTIAL_MOVE}
        style={[styles.box, { marginLeft: left }]}
      />
    </View>
  );
}

function RefusedBuildScene({
  left,
  settleColor,
}: { left: number } & SettleProps) {
  return (
    <View style={styles.container}>
      <SettleView settleColor={settleColor} />
      <Animated.View
        ref={useTestRef(REFUSED_REF)}
        layout={REFUSED_MOVE}
        style={[styles.box, { marginLeft: left }]}
      />
    </View>
  );
}

const retainedStyles = StyleSheet.create({
  settleView: {
    height: 2,
  },
});
