import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  PairLayouts,
  SizeBoxProps,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  hasNativeLayoutStarts,
  START_LEFT,
  END_LEFT,
  DURATION,
  POSITION_TOLERANCE,
  FIRST_FRAME_TRAVEL,
  FRAME_MS,
  centerOf,
  takeTraceOf,
  isHostEvent,
  sample,
  playbackCountOf,
  summarize,
  Scene,
  renderBox,
  mountScene,
  NATIVE_START,
  NATIVE_END,
  summarizeEnd,
  SizePair,
  sampleFramePairAt,
  framePairDistances,
  frameDistance,
  linearPairOf,
  PAIR_IN_ROW,
} from './nativeLayoutTestKit';

describe('native layout starts after the mount of the final state', () => {
  if (!hasNativeLayoutStarts) {
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
    expect(playing.playbackKeys.length).toBe(2);
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
    expect(end.playbackKeys.length).toBe(0);
    expect(Math.abs(end.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(
      true
    );
    await render(null);
  });
});

type SizeBoxFrame = Required<
  Pick<SizeBoxProps, 'left' | 'top' | 'width' | 'height'>
>;

describe('native layout size', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const SIZE_DURATION = 2000;
  const START: SizeBoxFrame = { left: 0, top: 0, width: 50, height: 50 };
  const MOVED: SizeBoxFrame = { left: 120, top: 40, width: 50, height: 50 };
  const RESIZED: SizeBoxFrame = { left: 0, top: 0, width: 150, height: 90 };
  const MOVED_AND_RESIZED: SizeBoxFrame = {
    ...MOVED,
    ...{ width: 150, height: 90 },
  };
  // 0.5 pt and the travel of one display frame at the mean speed of `travel` in `durationMs`.
  const toleranceOf = (travel: number, durationMs: number) =>
    POSITION_TOLERANCE + (FRAME_MS * travel) / durationMs;
  const LINEAR_TOLERANCE = toleranceOf(120, SIZE_DURATION);

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

  const linearPair = linearPairOf(SIZE_DURATION);

  async function playPair(
    layouts: PairLayouts,
    start: SizeBoxProps,
    end: SizeBoxProps,
    fractions?: number[]
  ) {
    const tag = await mountScene(<SizePair {...start} {...layouts} inRow />);
    await render(<SizePair {...end} {...layouts} inRow />);
    const rows = await sampleFramePairAt(SIZE_DURATION, fractions, PAIR_IN_ROW);
    const events = await takeTraceOf(tag);
    return { rows, events, distances: framePairDistances(rows) };
  }

  const linearCases: [string, SizeBoxFrame][] = [
    ['a position change', MOVED],
    ['a position change and a size change', MOVED_AND_RESIZED],
    ['a size change', RESIZED],
  ];
  for (const [caseName, end] of linearCases) {
    test(`LinearTransition with a linear easing plays ${caseName} on four native tracks and agrees with the frame driver`, async () => {
      const { rows, events, distances } = await playPair(
        linearPair,
        START,
        end
      );
      expect(summarizeStart(events)).toBe(FOUR_TRACKS);
      expect(summarizeResults(events)).toBe('Ended:Finished:None');
      expect(distances.during < LINEAR_TOLERANCE).toBe(true);
      expect(distances.atEnd < 0.01).toBe(true);
      expect(distances.keysAtEnd).toBe(0);
      expect(frameDistance(rows[1].native, rows[1].end) > 0.01).toBe(true);
      await render(null);
    });
  }
});
