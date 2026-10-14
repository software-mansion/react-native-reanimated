/*
 * The reference of the native layout suites is the declared timeline: the value of a leaf as a function of
 * the time from the start of its animation, from the declaration of the test. Each box is on its own clock.
 *
 * A: each sample of the native box shows the declared values of one time, from 18 ms before the sample to
 * the sample, on the clock of the origin of its command (a presentation value is of the first read of its
 * display frame, and it stays 15.7 to 17.7 ms, measured in 76 intervals; the 18 ms are that stay and
 * 0.3 ms). The check takes the times of these 18 ms 0.28 ms apart and the two sides of each phase edge, then the times around the nearest of them in steps that halve to 0.001 ms: a
 * read whose values fit only another time fails. A sample of the
 * `Transform` target is the 16 cells of its matrix against the matrix of the declared values of its
 * operations at one time, in the product order of a track that plays. The tolerance of a cell, 0.005, has
 * no derivation. A sample of a position target is the center of the box: the declared origin plus half of
 * the declared size of the same time. Each of the two keys has its own owner at that time: the size is of
 * the track that has the size key then, of the command of the position track or of another command, or the
 * size at rest when the size key has no track.
 *
 * The edge hold: a keyframe animation of the platform shows the start value of a segment while the eased
 * progress of the segment is 0.001 at most, and the end value while it is 0.999 at the least (measured on a
 * paused layer). A segment is from one key time to the next of the animation that the sample of the read
 * has for the track: the check takes the key times from the sample, on the time of the track from its first
 * move with a duration to its declared end. The eased progress of a segment at a time is the part of the
 * declared change between its two keys that the declared curve has at that time. The cubic of a fitted piece
 * is equal to it to the tolerance of the fit, 0.001 of the change (calculated). A track that a read does not
 * have an animation of (a replaced track, a layer at rest) has no hold. So a read can show such a value in
 * place of the declared value of a time of its 18 ms: the operations of a transform have their values of
 * one time, and all cells are of one matrix. A captured value
 * and statement B have no such allowance. Within the read band, this suite cannot distinguish the platform
 * hold from a native segment that keeps its start value through eased progress 0.001 or shows its end value
 * from eased progress 0.999. The frame-driven twin keeps its exact curve check without a hold allowance.
 * Each read that is on the timeline only by the hold is an `EDGE-HOLD` row. A read can also show the state
 * after the natural end of a track up to 1.78 ms before that end (the platform removes the animation in
 * that time, measured), of a `Transform` track too: a `REMOVAL-WINDOW` row. The two are not summed. Not
 * tested for the hold: a track with a curve and more than one segment, a `Transform` track with a curve, a
 * live layer with a curve, a device, an operation whose one move has no duration beside operations that
 * move. A limit: the check takes the member of a track by its place in the sample, for one playback of the
 * target on the layer; two playbacks of one target on one layer at one read are not tested. The hold has
 * the measured range only: the start value while the eased progress is from 0 to 0.001,
 * the end value while it is from 0.999 to 1. Not tested: what the platform shows while the eased progress
 * of a segment is outside 0 to 1 (the one cubic piece of `Easing.out(Easing.back(1.7))` goes over 1); there
 * the check has the declared values only.
 *
 * A track that replaces a track: before the `TrackStarted` time of the new track its key has the declared
 * value of the replaced track, as if it played on; from that time it has the new track, on the clock of the
 * origin of its command. The check takes the track of the key at each time of the 18 ms before the
 * sample, with no other allowance: a read on neither track fails. Each read whose 18 ms have that
 * `TrackStarted` time is a `GATE` row with the time and the track that the check found. A track that
 * replaces a track on screen starts at the value that the route captured from the replaced track for its
 * build. The time of a captured value is the origin of its build on the sample clock, where the product
 * computes it: the origin of the native command of the build, or the start call of the frame driver for a
 * build that it took. Each captured value is the declared value of its own track at that time, with the
 * uncertainty of the origin of the track and with no time before it. A `CAPTURE` row has the
 * steady-clock distance from that origin to the trace event of the capture. An operation of a transform
 * starts at the initial value of its builder. A read that shows the replaced track after the origin of the
 * new track is a property of the read and not of the screen. Measured by the hand-over measurement of Objective 12H: 62 of 62 reads
 * after a flush of the transaction were on the new track, plain reads showed the replaced track for 11.90
 * to 13.99 ms, and no recorded display frame was wrong in 10 of 10 replacements.
 *
 * B: each frame of the frame-driven twin wrote the value that a replay of the declared timeline has at the
 * frame time, after the start call of the record. The replay (`replayFrames`) is a copy of the start rules
 * of the frame driver as the kit writes them: a timing moves its start to a frame before it (`timing` of
 * `withTiming`), a delay starts its animation in the first frame at or after its end (`delay` of
 * `withDelay`), a sequence starts its next animation in the frame in which the current one ends (`sequence`
 * of `withSequence`), a timing that replaces a timing with its end value adopts the start of that timing
 * with its own duration and easing (`onStart` of `withTiming`), and a delay runs the animation that its
 * animation replaced (`delay` of `withDelay`). B checks recorded root values against this replay. It does
 * not read child phase starts or prove that these rules are correct: a defect that is in the frame driver
 * and in the copy passes, and a phase that holds one value hides a change of its start. A change of a rule
 * that moves a frame value fails B. So B does not prove that a phase of the twin starts at its declared
 * time: the suite `native layout live clock` bounds that. Each phase start that this suite prints is a
 * computed start of the replay.
 *
 * The layout rounds a fractional number of a size or of a position to the pixel grid, so the number of a
 * case is not the value that an animation gets, and the layout can give two boxes two values for one
 * number. For each such number of the first place and of the last place of a case, each box has its own
 * laid-out value: its model at rest in the place, before the first commit and after the callbacks. The
 * values do not come from a frame of an animation. A and the tracks take the values of the native box; B of
 * the twin takes the values of the twin. A `MOUNTED` row has the number of the case and the two laid-out
 * values. Each of the two is less than one step of the pixel grid from the number of the case. No statement
 * says that the two are equal.
 *
 * A does not check a read in the first 18 ms after `TrackStarted` of a track that replaces no track, of a
 * key that starts at a value that its view did not show before its command: a view that mounts with the
 * command, or a key with an initial value. Measured in 19 runs with no load, with a busy main thread, and
 * with a busy JS thread: such a read showed the value before the command, the model value of a new view or
 * the value of the style, up to 13.88 ms after `TrackStarted`, and the first read on the timeline came 0.48
 * to 14.30 ms after it. The 18 ms are the stay of a presentation value of statement A: not a bound
 * for each machine. A read off the timeline after them fails. Each run prints the reads of each such start
 * as one `GATE` row. The screen does not show the value before the command, measured by the hand-over
 * measurement of Objective 12H on recorded display frames: no flash for a view that enters (50 of 50 starts,
 * and 3 of 3 with a block of the main thread of 600 ms) and none for a layout animation with an initial
 * offset (50 of 50, and 3 of 3). A view with an initial transform: not tested. Another track has no gate.
 *
 * Each checked read that is off the timeline is an `OFF` row with the state of its view. Statement A is the
 * same for each read: a read of a track that the frame driver took, from the start call of the frame driver
 * for the key to the end report of the track, has no rule of its own.
 *
 * No statement here compares the two boxes at one instant. So this suite does not prove: the distance of
 * the two boxes on the wall clock, the lag of the frame driver, when a callback comes, the pixels on
 * screen, the order in which the screen shows the operations of a transform, the edge antialiasing. The
 * suite `native layout live clock` has the wall-clock statements of the same cases.
 */
import React from 'react';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
} from '../../../ReJest/RuntimeTestsApi';
import type { Place, ReferenceCase } from './nativeLayoutReferencePlay';
import {
  expectModelOnFrames,
  expectNoKeyAfterTransfer,
  expectReference,
  play,
  REFERENCE_CASES,
} from './nativeLayoutReferencePlay';
import type { SizeBoxProps } from './nativeLayoutTestKit';
import {
  BOX_REF,
  builderCalls,
  callbacks,
  END_LEFT,
  FRAME_BOX_REF,
  hasNativeLayoutRoute,
  isNear,
  layoutOf,
  opacities,
  PAIR_TOP,
  renderBox,
  Scene,
  START_LEFT,
  takeTraceUntil,
  waitForBuilderCalls,
  waitForCallbacks,
  waitForModel,
  WriterBox,
} from './nativeLayoutTestKit';

const FADED = 0.2;
const WRITTEN = 0.6;
const fadedAt = (left: number, top: number): Place => ({
  left,
  top,
  opacity: FADED,
});

function FadedWriterBox(box: SizeBoxProps) {
  return <WriterBox {...box} initialOpacity={FADED} />;
}

/**
 * The frame driver takes the X track and the opacity track for the spring of
 * the second commit.
 */
const HANDED_FADE: ReferenceCase = {
  flow: 'layout',
  leaves: {
    originX: { duration: 1600, onlyWhenChanged: true },
    originY: { isSpring: true, onlyWhenChanged: true },
    opacity: { duration: 1600, initial: 0.9, to: FADED },
  },
  places: [
    fadedAt(START_LEFT, 0),
    fadedAt(END_LEFT, 0),
    fadedAt(END_LEFT, PAIR_TOP),
  ],
  commitTimesMs: [600],
  totalMs: 1600,
  box: { Box: FadedWriterBox },
};

/** Each case gives its opacity track to the frame driver. */
const HAND_OVER_CASES: Record<string, ReferenceCase> = {
  'a clip of a fade': {
    flow: 'entering',
    leaves: { opacity: { duration: 2000, initial: 0, to: 1 } },
    places: [undefined, { left: START_LEFT, top: 0 }],
    totalMs: 2000,
    clip: { atMs: 300, backAtMs: 1200 },
  },
  'a box with an animated style': HANDED_FADE,
  'a write of the opacity': {
    ...HANDED_FADE,
    write: {
      atMs: 300,
      targets: ['Opacity'],
      run: () => {
        opacities[BOX_REF].value = WRITTEN;
        opacities[FRAME_BOX_REF].value = WRITTEN;
        return waitForModel(
          getTestComponent(BOX_REF).getTag(),
          'Opacity',
          ([opacity]) => isNear(opacity, WRITTEN)
        );
      },
    },
  },
};

describe('native layout reference', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [caseName, referenceCase] of Object.entries(REFERENCE_CASES)) {
    test(`${caseName}: the native samples and the frames of the twin are on the declared timeline`, async () => {
      expectReference(caseName, referenceCase, await play(referenceCase));
      await render(null);
    });
  }

  for (const [caseName, referenceCase] of Object.entries(HAND_OVER_CASES)) {
    test(`${caseName}: the native samples and the frames of the twin are on the declared timeline, and the opacity model of the native box is on the frames of the frame driver`, async () => {
      const played = await play(referenceCase);
      const reads = expectReference(caseName, referenceCase, played);
      console.log(
        `CHECKED | ${caseName} | statement A checks ${reads.filter(({ isChecked }) => isChecked).length} of ${reads.length} reads`
      );
      expectNoKeyAfterTransfer(played, 'Opacity');
      expectModelOnFrames(caseName, played, 'Opacity');
      if (referenceCase.write) {
        const { native, frame } = played.end!;
        console.log(
          `WRITTEN-END | ${caseName} | native model ${native.Opacity.model[0]}, native presentation ${native.Opacity.presentation[0]}, twin model ${frame.Opacity.model[0]}`
        );
        expect(
          isNear(native.Opacity.presentation[0], frame.Opacity.model[0])
        ).toBe(true);
      }
      await render(null);
    });
  }

  test('three starts: the test waits for the builder call and for the native start of each, and the callbacks are false, false, and true', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'chain' });
    const tag = await renderBox({ layout });
    let starts = 0;
    for (const left of [END_LEFT, 2 * END_LEFT, START_LEFT]) {
      await render(<Scene left={left} layout={layout} />);
      starts++;
      expect(await waitForBuilderCalls(starts)).toBe('');
      const events = await takeTraceUntil((taken) =>
        taken.some(isAdmittedOf(tag))
      );
      expect(events.filter(isAdmittedOf(tag)).length).toBe(1);
    }
    const expected = ['chain:false', 'chain:false', 'chain:true'];
    expect(await waitForCallbacks(expected)).toBe('');
    expect(callbacks.join()).toBe(expected.join());
    expect(builderCalls).toBe(starts);
    await render(null);
  });
});

const isAdmittedOf =
  (viewTag: number) =>
  ({ event, tag }: { event: string; tag: number }) =>
    event === 'Admitted' && tag === viewTag;
