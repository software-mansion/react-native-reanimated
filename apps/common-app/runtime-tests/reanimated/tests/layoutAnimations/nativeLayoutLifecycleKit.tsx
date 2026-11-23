/*
 * Reads of the lifecycle and stress suites of the native layout route. A case
 * reads the retained state at a settle point before and after its work: the
 * case scene is gone, the host has no command and the layout proxy no
 * frame-driven animation (the exits that the unmount started have ended), one
 * trailing commit runs a pull, a garbage collection
 * runs on Android (the geometry writers are a map with weak keys), then two
 * reads 5 display frames apart. Two reads that differ are a test fault, not a
 * result.
 */

import { Platform, StyleSheet, View } from 'react-native';

import { render, wait, waitForFrames } from '../../../ReJest/RuntimeTestsApi';
import type { NativeAnimationContainerSizes } from '../nativeAnimationObservation';
import {
  containerSizes,
  pendingBuildCountOf,
  samplesView,
} from '../nativeAnimationObservation';
import { collectGarbage } from '../viewSampler';
import type { TraceEvent } from './nativeLayoutTestKit';
import { FRAME_MS, summarize } from './nativeLayoutTestKit';

export type RetainedRead = {
  sizes: NativeAnimationContainerSizes;
  /** No number when the read gives none: then the count is not compared. */
  pendingBuilds: number | undefined;
};

const SETTLE_FRAMES = 10;
const READ_GAP_FRAMES = 5;
const LIVE_ANIMATION_CONTAINERS = [
  'host.commands',
  'registry.proxies.layoutAnimations',
];
const ANIMATIONS_END_TIMEOUT_MS = 6000;

export async function settledRead(caseName: string, point: string) {
  await render(null);
  await waitForFrames(SETTLE_FRAMES);
  await waitForNoLiveAnimation(`${caseName}, ${point}`);
  await render(<SettleView />);
  if (Platform.OS === 'android') {
    await collectGarbage();
  }
  await waitForFrames(SETTLE_FRAMES);
  const first = await readRetained();
  await waitForFrames(READ_GAP_FRAMES);
  const second = await readRetained();
  printRetained(caseName, point, [first, second]);
  const instability = differencesOf(first, second);
  if (instability !== '') {
    throw new Error(
      `${caseName}, ${point}: the two reads of the settle point differ (${instability}). This is a test fault, and the case is not counted.`
    );
  }
  return first;
}

/**
 * The exits that the unmount started are native commands or frame-driven
 * animations of the layout proxy.
 */
async function waitForNoLiveAnimation(readName: string) {
  const deadline = performance.now() + ANIMATIONS_END_TIMEOUT_MS;
  let live = liveAnimationsOf(await containerSizes());
  while (live !== '' && performance.now() < deadline) {
    await wait(FRAME_MS);
    live = liveAnimationsOf(await containerSizes());
  }
  if (live !== '') {
    throw new Error(
      `${readName}: ${live} ${ANIMATIONS_END_TIMEOUT_MS} ms after the unmount of the scene. This is a test fault, and the case is not counted.`
    );
  }
}

const liveAnimationsOf = (sizes: NativeAnimationContainerSizes) =>
  LIVE_ANIMATION_CONTAINERS.filter((name) => (sizes[name] ?? 0) > 0)
    .map((name) => `${name} ${sizes[name]}`)
    .join(', ');

export async function readRetained(): Promise<RetainedRead> {
  const sizes = await containerSizes();
  return { sizes, pendingBuilds: pendingBuildCountOf() };
}

function printRetained(caseName: string, point: string, reads: RetainedRead[]) {
  const readText = ({ sizes, pendingBuilds }: RetainedRead) =>
    [
      `pendingBuilds=${pendingBuilds}`,
      ...Object.keys(sizes)
        .sort()
        .map((name) => `${name}=${sizes[name]}`),
    ].join(' ');
  console.log(
    `LIFECYCLE-RETAINED | ${caseName} | ${point} | ${reads.map(readText).join(' | ')}`
  );
}

/**
 * The sizes that grew from `before` to `after`: a size that falls keeps no
 * state.
 */
export const growthOf = (before: RetainedRead, after: RetainedRead) =>
  differencesOf(before, after, (first, second) => second > first);

export function differencesOf(
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
  if (
    first.pendingBuilds !== undefined &&
    second.pendingBuilds !== undefined &&
    isDifference(first.pendingBuilds, second.pendingBuilds)
  ) {
    differences.push(
      `pendingBuilds ${first.pendingBuilds} -> ${second.pendingBuilds}`
    );
  }
  return differences.join(', ');
}

export const sizeOf = ({ sizes }: RetainedRead, name: string) =>
  sizes[name] ?? 0;

const commandKeyOf = ({ owner, surfaceId, tag, generation }: TraceEvent) =>
  `${owner} ${surfaceId}.${tag}.${generation}`;

/**
 * The commands of `events` that do not have exactly one result: a command with
 * a start event (`LayoutStartPending` or `Received`) needs one `Ended`, and an
 * `Ended` needs a start event.
 */
export function commandsWithoutOneResult(events: TraceEvent[]) {
  const eventsOfCommand = new Map<string, TraceEvent[]>();
  for (const event of events) {
    const key = commandKeyOf(event);
    eventsOfCommand.set(key, [...(eventsOfCommand.get(key) ?? []), event]);
  }
  return [...eventsOfCommand.entries()]
    .filter(([, own]) => {
      const isStarted = own.some(({ event }) => START_EVENTS.includes(event));
      const results = own.filter(({ event }) => event === 'Ended').length;
      return isStarted ? results !== 1 : results > 0;
    })
    .map(([key, own]) => `${key}: ${summarize(own)}`)
    .sort()
    .join(', ');
}

const START_EVENTS = ['LayoutStartPending', 'Received'];

export const summarizeOf = (events: TraceEvent[], tag: number) =>
  summarize(events.filter((event) => event.tag === tag));

export { samplesView as hasView };

function SettleView() {
  return <View style={lifecycleStyles.settleView} />;
}

const lifecycleStyles = StyleSheet.create({
  settleView: {
    height: 2,
    backgroundColor: 'whitesmoke',
  },
});
