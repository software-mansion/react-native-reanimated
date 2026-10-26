/*
 * Each test that plays a case (`playCase`) has the method of the suite `native layout reference`, each box
 * on its own clock: each sample of the native box is on the declared timeline of its key at the time of the
 * sample from the origin of its command (statement A), and each frame of the frame-driven twin and of the
 * frame driver on the native box is on a replay of the declared timeline at its frame time (statement B).
 * A check of a playback key count or of a model in such a test is for each row, by the time of the row
 * against the times of the trace. Each other test has state checks and trace checks at planned times.
 *
 * Not proved: the distance of the two boxes at one instant, the lag of the frame driver, the in-flight
 * curve of a CSS writer that the frame loop plays, the model of the native box while the frame driver has
 * a position track (the player has statement M only for the opacity and the transform), when a callback
 * comes. The pixels on screen, a device, and 120 Hz are not tested.
 *
 * Not converted (the old pair comparison at planned times):
 * the test that calls `sampleOpacityPair`, and each test that calls `readPair`.
 */
import type { ComponentRef } from 'react';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  describe,
  expect,
  getTestComponent,
  render,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { PairProps } from './nativeLayoutTestKit';
import {
  ClippingScrollView,
  BOX_REF,
  BOX_SIZE,
  callbacks,
  FRAME_BOX_REF,
  FRAME_MS,
  frameRecordedOf,
  hasNativeLayoutRoute,
  layoutOf,
  sample,
  isNear,
  LAID_OUT_TOLERANCE,
  mountScene,
  Pair,
  PAIR_CELL_HEIGHT,
  PAIR_LEFT,
  POSITION_TOLERANCE,
  REMOVES_TRACKS_OUT_OF_WINDOW,
  readFrameRecords,
  resetFrameRecords,
  routeOf,
  START_LEFT,
  summarizeEnd,
  takeTraceOf,
  waitForCallbacks,
  movingGeometryTest,
} from './nativeLayoutTestKit';

const scrollRef = React.createRef<ComponentRef<typeof ScrollView>>();

/** A scroll to `CLIPPED_OFFSET` takes the two boxes out of the window. */
function ClippedPair(pair: PairProps) {
  return (
    <ClippingScrollView scrollRef={scrollRef} style={styles.scroll}>
      <Pair {...pair} />
      <View style={styles.scrollFiller} />
    </ClippingScrollView>
  );
}

const CLIPPED_OFFSET = 1500;
const scrollTo = (y: number) =>
  scrollRef.current?.scrollTo({ y, animated: false });

describe('a native layout group whose tracks the platform removes', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  type Clipped = { nativeTag: number; frameTag: number; startMs: number };

  /** Mounts the pair, then renders `moved`. */
  async function move(mounted: PairProps, moved: PairProps): Promise<Clipped> {
    await mountScene(<ClippedPair {...mounted} />);
    const tags = {
      nativeTag: getTestComponent(BOX_REF).getTag(),
      frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
    };
    const startMs = performance.now();
    await render(<ClippedPair {...moved} />);
    return { ...tags, startMs };
  }

  const waitUntil = ({ startMs }: Clipped, elapsedMs: number) =>
    wait(Math.max(0, startMs + elapsedMs - performance.now()));

  async function readBox(tag: number) {
    const [x, y, opacity] = await Promise.all([
      sample(tag, 'PositionX'),
      sample(tag, 'PositionY'),
      sample(tag, 'Opacity'),
    ]);
    return {
      x: x.model[0],
      y: y.model[0],
      opacity: opacity.model[0],
      shownX: x.presentation[0],
      shownY: y.presentation[0],
      shownOpacity: opacity.presentation[0],
      keys: x.playbacks.length,
    };
  }

  /** The frame-driven box is the reference. It is one cell below the native box. */
  async function readPair({ nativeTag, frameTag }: Clipped) {
    const [native, frame] = await Promise.all([
      readBox(nativeTag),
      readBox(frameTag),
    ]);
    return { native, frame: { ...frame, y: frame.y - PAIR_CELL_HEIGHT } };
  }

  const isFrameUpdate = ({ event }: { event: string }) =>
    event === 'FrameUpdateMounted';

  async function takeTransferTrace({ nativeTag }: Clipped) {
    const events = await takeTraceOf(nativeTag);
    return {
      host: summarizeEnd(events.filter((event) => !isFrameUpdate(event))),
      hasFrameUpdate: events.some(isFrameUpdate),
    };
  }

  const sortedCallbacks = () => callbacks.slice().sort().join();

  /** Damping ratio 1, natural frequency 7/s: it settles in about 1767 ms. */
  const SLOW_SPRING = { stiffness: 49, damping: 14, mass: 1 };
  const SLOW_SPRING_MS = 1770;

  if (REMOVES_TRACKS_OUT_OF_WINDOW) {
    movingGeometryTest(
      'a clip of the view gives a native spring track to the frame driver, and the first frame-driven value of the view continues from the native value',
      async () => {
        const layoutOfBox = (box: string, hasCallback: boolean) =>
          frameRecordedOf(
            box,
            layoutOf(
              { originX: { spring: SLOW_SPRING, hasCallback } },
              { name: box }
            )
          );
        const layouts = {
          nativeLayout: layoutOfBox('native', false),
          frameLayout: layoutOfBox('frame', true),
        };
        resetFrameRecords();
        const clipped = await move(
          { left: START_LEFT, ...layouts },
          { left: PAIR_LEFT, ...layouts }
        );
        await waitUntil(clipped, SLOW_SPRING_MS / 4);
        const startEvents = await takeTraceOf(clipped.nativeTag);
        const playing = await sample(clipped.nativeTag, 'PositionX');
        expect(
          routeOf(startEvents, clipped.nativeTag, 'PositionX', [playing]).kind
        ).toBe('native playing');
        scrollTo(CLIPPED_OFFSET);
        await waitUntil(clipped, SLOW_SPRING_MS / 2);
        const transfer = await takeTransferTrace(clipped);
        expect(transfer.host).toBe(
          'TrackEnded:PositionX:false > Ended:Interrupted:PlatformRemoved'
        );
        expect(transfer.hasFrameUpdate).toBe(true);
        const handed = await readPair(clipped);
        const [nativeRecord, twinRecord] = ['native', 'frame'].map((box) =>
          readFrameRecords()
            .filter((record) => record.box === box && record.key === 'originX')
            .pop()
        );
        const twinAt = new Map(
          (twinRecord?.frames ?? []).map(({ timeMs, value }) => [
            timeMs,
            Number(value),
          ])
        );
        const originMs = nativeRecord?.start?.timeMs ?? NaN;
        const nativeFrames = nativeRecord?.frames ?? [];
        const firstHandedIndex = nativeFrames.findIndex(
          ({ timeMs }) => timeMs > originMs && twinAt.has(timeMs)
        );
        const firstHanded = nativeFrames[firstHandedIndex] as
          | (typeof nativeFrames)[number]
          | undefined;
        console.log(
          `SPRING-HAND-OVER | build origin ${originMs}; first native frame after the origin at a time of the twin: native box ${firstHanded?.value} at ${firstHanded && (firstHanded.timeMs - originMs).toFixed(2)} ms after the origin, twin ${firstHanded && twinAt.get(firstHanded.timeMs)}, native frames before it ${firstHandedIndex}; first read after the hand-over: native box ${handed.native.x}, frame driver ${handed.frame.x}, playback keys ${handed.native.keys}`
        );
        expect(firstHanded !== undefined).toBe(true);
        expect(
          firstHanded !== undefined &&
            isNear(
              Number(firstHanded.value),
              twinAt.get(firstHanded.timeMs)!,
              POSITION_TOLERANCE
            )
        ).toBe(true);
        expect(handed.native.keys).toBe(0);
        expect(
          isNear(handed.native.x, handed.frame.x, POSITION_TOLERANCE)
        ).toBe(true);
        scrollTo(0);
        expect(
          await waitForCallbacks(['frame:true', 'native:true'], SLOW_SPRING_MS)
        ).toBe('');
        await wait(4 * FRAME_MS);
        expect(sortedCallbacks()).toBe('frame:true,native:true');
        const end = await readBox(clipped.nativeTag);
        expect(end.keys).toBe(0);
        expect(
          isNear(end.shownX, PAIR_LEFT + BOX_SIZE / 2, LAID_OUT_TOLERANCE)
        ).toBe(true);
        await render(null);
      }
    );
  }
});

const styles = StyleSheet.create({
  scroll: {
    height: 2 * PAIR_CELL_HEIGHT,
  },
  scrollFiller: {
    height: 3000,
  },
});
