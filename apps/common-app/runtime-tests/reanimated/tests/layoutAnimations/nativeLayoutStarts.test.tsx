import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
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
  callbacks,
  layoutOf,
  Scene,
  renderBox,
  NATIVE_START,
  NATIVE_END,
  SORTED_START_AND_END,
  summarizeEnd,
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

describe('native layout starts with no duration', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  test('a delay holds the start value, then the endpoint shows and the callback gets true', async () => {
    // The Y track has the timeline end of the hold, so its end report is the time reference.
    const layout = layoutOf(
      { originX: { duration: 0, delays: [DURATION] }, originY: {} },
      { name: 'hold' }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 2);

    const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(startEvents)).toBe(NATIVE_START);
    const held = await sample(tag, 'PositionX');
    expect(playbackCountOf(held, startEvents[0].generation)).toBe(2);
    expect(Math.abs(held.model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(Math.abs(held.presentation[0] - centerOf(START_LEFT)) < 0.01).toBe(
      true
    );
    expect(callbacks.length).toBe(0);

    await wait(DURATION);
    const endEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarizeEnd(endEvents)).toBe(NATIVE_END);
    const endTimeOf = (target: string) =>
      endEvents.find((event) => event.target === target)!.monotonicTimeMs;
    const holdEnd = endTimeOf('PositionX');
    expect(holdEnd - startEvents[0].monotonicTimeMs > DURATION - FRAME_MS).toBe(
      true
    );
    expect(Math.abs(holdEnd - endTimeOf('PositionY')) < FRAME_MS).toBe(true);
    const end = await sample(tag, 'PositionX');
    expect(end.playbackKeys.length).toBe(0);
    expect(Math.abs(end.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(
      true
    );
    expect(callbacks.join()).toBe('hold:true');
    await render(null);
  });

  test('each negative delay wrapper counts as zero before the hold', async () => {
    const leaf = { duration: 0, delays: [-DURATION, DURATION] };
    const layout = layoutOf({ originX: leaf, originY: leaf });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 2);
    const held = await sample(tag, 'PositionX');
    expect(Math.abs(held.presentation[0] - centerOf(START_LEFT)) < 0.01).toBe(
      true
    );
    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(SORTED_START_AND_END);
    await render(null);
  });
});
