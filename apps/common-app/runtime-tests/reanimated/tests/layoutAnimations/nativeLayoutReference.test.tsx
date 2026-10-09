/*
 * The reference of the native layout suites is the declared timeline: the value of a leaf as a function of
 * the time from the start of its animation, from the declaration of the test. Each box is on its own clock.
 *
 * A: each sample of the native box shows the declared values of one time, from one display frame before the
 * sample to the sample, on the clock of the origin of its command (a presentation value is of the first
 * read of its display frame). The check takes the times of that display frame 0.26 ms apart and the two
 * sides of each phase edge: a read whose values fit only a time between two of them fails. A sample of the
 * `Transform` target is the 16 cells of its matrix against the matrix of the declared values of its
 * operations at one time, in the product order of a track that plays. The tolerance of a cell, 0.005, has
 * no derivation. A sample of a position target is the center of the box: the declared origin plus half of
 * the declared size of the same time, which is the size track of the command or the size at rest.
 *
 * A track that replaces a track: before the `TrackStarted` time of the new track its key has the declared
 * value of the replaced track, as if it played on; from that time it has the new track, on the clock of the
 * origin of its command. The check takes the track of the key at each time of the display frame before the
 * sample, with no other allowance: a read on neither track fails. Each read whose display frame has that
 * `TrackStarted` time is a `GATE` row with the time and the track that the check found. A track that
 * replaces a track on screen starts at the value that the route captured from the replaced track for its
 * build, and each captured value is on the timeline of its own track at its time: a `CAPTURE` row has the
 * time of the capture from the origin of the new track. An operation of a transform starts at the initial
 * value of its builder. A read that shows the replaced track after the origin of the new track is a property
 * of the read and not of the screen. Measured by the hand-over measurement of Objective 12H: 62 of 62 reads
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
 * A does not check a read in the first 18 ms after `TrackStarted` of a track that replaces no track, of a
 * key that starts at a value that its view did not show before its command: a view that mounts with the
 * command, or a key with an initial value. Measured in 19 runs with no load, with a busy main thread, and
 * with a busy JS thread: such a read showed the value before the command, the model value of a new view or
 * the value of the style, up to 13.88 ms after `TrackStarted`, and the first read on the timeline came 0.48
 * to 14.30 ms after it. The 18 ms are one display frame and 1.33 ms: a choice from these data, not a bound
 * for each machine. A read off the timeline after them fails. Each run prints the reads of each such start
 * as one `GATE` row. The screen does not show the value before the command, measured by the hand-over
 * measurement of Objective 12H on recorded display frames: no flash for a view that enters (50 of 50 starts,
 * and 3 of 3 with a block of the main thread of 600 ms) and none for a layout animation with an initial
 * offset (50 of 50, and 3 of 3). A view with an initial transform: not tested. Another track has no gate.
 *
 * Each checked read that is off the timeline is an `OFF` row with the state of its view. The row has the
 * mark `defect 12H` when the read is in the hand-over window of its track: from the start call of the frame
 * driver for the key to the end report of the track. Objective 12H measured that the layer can show the
 * model plus the offset of the track there. The mark is a print: statement A is the same for each read.
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
  render,
  test,
} from '../../../ReJest/RuntimeTestsApi';
import {
  expectReference,
  play,
  REFERENCE_CASES,
} from './nativeLayoutReferencePlay';
import {
  builderCalls,
  callbacks,
  END_LEFT,
  hasNativeLayoutStarts,
  layoutOf,
  renderBox,
  Scene,
  START_LEFT,
  takeTraceUntil,
  waitForBuilderCalls,
  waitForCallbacks,
} from './nativeLayoutTestKit';

describe('native layout reference', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [caseName, referenceCase] of Object.entries(REFERENCE_CASES)) {
    test(`${caseName}: the native samples and the frames of the twin are on the declared timeline`, async () => {
      expectReference(caseName, referenceCase, await play(referenceCase));
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
