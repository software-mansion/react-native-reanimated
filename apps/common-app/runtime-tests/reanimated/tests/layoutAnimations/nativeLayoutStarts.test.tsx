/*
 * Each test that plays a case (`playCase`) has the method of the suite `native layout reference`, each box
 * on its own clock: each sample of the native box is on the declared timeline of its key at the time of the
 * sample from the origin of its command (statement A), each frame of the frame-driven twin and of the
 * frame driver on the native box is on a replay of the declared timeline at its frame time (statement B),
 * and at the end the native box shows its model and the twin has the same model. A check of a playback key
 * count or of a held size in such a test is for each row, by the time of the row against the times of the
 * trace. Each other test has state checks and trace checks at planned times.
 *
 * The method does not prove: the distance of the two boxes at one instant, the lag of the frame driver,
 * that the two starts are in one display frame, when a callback comes or the gap of two callbacks, that a
 * row comes in each part of a timeline, a native value in the first display frame after its origin to
 * better than one display frame. The pixels on screen, a device, and 120 Hz are not tested.
 *
 * Statement A has the edge hold of `native layout reference`. Within the read band, this suite cannot
 * distinguish the platform hold from a native segment that keeps its start value through eased progress
 * 0.001 or shows its end value from eased progress 0.999. The frame-driven twin keeps its exact curve check
 * without a hold allowance.
 *
 * The suite `native layout live clock` has the wall-clock statements for the cases of this suite in
 * `nativeLayoutLiveClockCases.ts`: the pair of the two boxes at one instant, the gap of the two end
 * callbacks, and a row of the native box in each phase.
 */

import { Easing, LinearTransition } from 'react-native-reanimated';

import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  MOVED_AND_RESIZED,
  SIZE_DURATION,
  SIZE_START,
} from './nativeLayoutLiveClockCases';
import type {
  CallbackBuilder,
  Place,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import { expectReference, play } from './nativeLayoutReferencePlay';
import type { Leaf, TraceEvent } from './nativeLayoutTestKit';
import {
  hasNativeLayoutRoute,
  START_LEFT,
  END_LEFT,
  DURATION,
  POSITION_TOLERANCE,
  FIRST_FRAME_TRAVEL,
  centerOf,
  takeTraceOf,
  isHostEvent,
  sample,
  playbackCountOf,
  summarize,
  Scene,
  renderBox,
  NATIVE_START,
  NATIVE_END,
  summarizeEnd,
} from './nativeLayoutTestKit';

const REST_TOLERANCE = 0.01;

/**
 * Plays a case on the native box and on its frame-driven twin, with statements
 * A and B of `native layout reference` and the end of the two boxes.
 */
async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await play(referenceCase);
  const reads = expectReference(caseName, referenceCase, played);
  expectAtRest(played);
  return { ...played, reads };
}

/**
 * At the end the native box shows its model, and the twin has the model of the
 * native box.
 */
function expectAtRest({ end }: Played) {
  for (const [target, { presentation, model }] of Object.entries(
    end?.native ?? {}
  )) {
    model.forEach((value, index) => {
      expect(Math.abs(presentation[index] - value) < REST_TOLERANCE).toBe(true);
      expect(
        Math.abs(end!.frame[target].model[index] - value) < REST_TOLERANCE
      ).toBe(true);
    });
  }
}

describe('native layout starts after the mount of the final state', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  test('the final state mounts before admission and the model holds the endpoint', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION / 2);

    const events = await takeTraceOf(tag);
    expect(summarize(events.filter(isHostEvent))).toBe(NATIVE_START);
    expect(events[0].owner).toBe('Layout');
    expect(events[1].transactionNumber).toBe(events[0].transactionNumber);
    expect(events[3].endpointPolicy).toBe('MountedModelMustMatchEndpoint');

    const playing = await sample(tag, 'PositionX');
    const { model, presentation, monotonicTimeMs } = playing;
    expect(playing.playbacks.length).toBe(2);
    expect(playbackCountOf(playing, events[0].generation)).toBe(2);
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    const progress = (monotonicTimeMs - events[0].monotonicTimeMs) / DURATION;
    const expectedX = centerOf(START_LEFT) + progress * (END_LEFT - START_LEFT);
    expect(
      Math.abs(presentation[0] - expectedX) <
        FIRST_FRAME_TRAVEL + POSITION_TOLERANCE
    ).toBe(true);

    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
    const end = await sample(tag, 'PositionX');
    expect(end.playbacks.length).toBe(0);
    expect(Math.abs(end.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(
      true
    );
    await render(null);
  });
});

describe('native layout size', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const START = SIZE_START;
  const MOVED: Place = { left: 120, top: 40, width: 50, height: 50 };
  const RESIZED: Place = { left: 0, top: 0, width: 150, height: 90 };

  const startOf = (...targets: string[]) =>
    `LayoutStartPending > LayoutStartMounted > Received > ${targets
      .map((target) => `TrackStarted:${target}`)
      .join(' > ')} > Admitted`;
  const FOUR_TRACKS = startOf('PositionX', 'PositionY', 'Width', 'Height');

  const isStartEvent = ({ event }: TraceEvent) =>
    event !== 'TrackEnded' && event !== 'Ended';
  const summarizeStart = (events: TraceEvent[]) =>
    summarize(events.filter(isHostEvent).filter(isStartEvent));
  const summarizeResults = (events: TraceEvent[]) =>
    summarize(events.filter(({ event }) => event === 'Ended'));

  const linearLayout = (durationMs: number) =>
    LinearTransition.duration(durationMs).easing(Easing.linear);
  const LINEAR_LEAF: Leaf = { duration: SIZE_DURATION };
  const LINEAR: Pick<ReferenceCase, 'leaves' | 'builder'> = {
    leaves: {
      originX: LINEAR_LEAF,
      originY: LINEAR_LEAF,
      width: LINEAR_LEAF,
      height: LINEAR_LEAF,
    },
    builder: () => linearLayout(SIZE_DURATION) as unknown as CallbackBuilder,
  };

  const sizeCaseOf = (
    declaration: Pick<ReferenceCase, 'leaves' | 'builder'>,
    start: Place,
    end: Place,
    options: Pick<ReferenceCase, 'box' | 'alsoSampled'> = {}
  ): ReferenceCase => ({
    flow: 'layout',
    ...declaration,
    places: [start, end],
    totalMs: SIZE_DURATION,
    ...options,
  });

  const linearCases: [string, Place][] = [
    ['a position change', MOVED],
    ['a position change and a size change', MOVED_AND_RESIZED],
    ['a size change', RESIZED],
  ];
  for (const [caseName, end] of linearCases) {
    test(`LinearTransition with a linear easing plays ${caseName} on four native tracks, and the native values and the frames of the frame driver are on its timeline`, async () => {
      const { events } = await playCase(
        caseName,
        sizeCaseOf(LINEAR, START, end)
      );
      expect(summarizeStart(events)).toBe(FOUR_TRACKS);
      expect(summarizeResults(events)).toBe('Ended:Finished:None');
      await render(null);
    });
  }
});
