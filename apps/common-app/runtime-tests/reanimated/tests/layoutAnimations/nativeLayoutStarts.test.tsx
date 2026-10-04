import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  getStaticFeatureFlag,
  LinearTransition,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';

type TraceEvent = {
  event: string;
  surfaceId: number;
  tag: number;
  owner: string;
  generation: number;
  monotonicTimeMs: number;
  target?: string;
  endpointPolicy?: string;
  finished?: boolean;
  outcome?: string;
  reason?: string;
  transactionNumber?: number;
  presentationValue?: number[];
};

type TargetSample = {
  model: number[];
  presentation: number[];
  monotonicTimeMs: number;
};

type NativeAnimationDevTools = {
  takeNativeAnimationTrace?: (callback: (events: TraceEvent[]) => void) => void;
  armNativeLayoutStart?: (
    tag: number,
    durationMs: number,
    delayMs: number,
    animatesOpacity: boolean,
    count: number
  ) => void;
  cancelNativeLayoutCommand?: (tag: number) => void;
  sampleNativeAnimationTarget?: (
    tag: number,
    target: string,
    callback: (sample: TargetSample | undefined) => void
  ) => void;
};

const devTools = (
  globalThis as unknown as { __reanimatedModuleProxy: NativeAnimationDevTools }
).__reanimatedModuleProxy;

// The entries exist only in development builds of the native code, and the route only with the flag.
const hasNativeLayoutStarts =
  Platform.OS === 'ios' &&
  getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION') &&
  devTools.armNativeLayoutStart !== undefined;

const BOX_REF = 'NativeLayoutStartBox';
const BOX_SIZE = 50;
const START_LEFT = 0;
const END_LEFT = 100;
const DURATION = 400;
const FRAME_DRIVEN_DURATION = 200;
const POSITION_TOLERANCE = 0.5;
const REPEATED_STARTS = 30;
const FILTER_OPACITY = 0.5;
// The travel of two display frames at 60 fps.
const FIRST_FRAME_TRAVEL = ((END_LEFT - START_LEFT) / DURATION) * 34;

const centerOf = (left: number) => left + BOX_SIZE / 2;

const clientReports: TraceEvent[] = [];

const isClientReport = ({ event }: TraceEvent) =>
  event === 'ClientAdmitted' || event === 'ClientEnded';

// Gives the host and layout events. The reports that the trace client got go to `clientReports`.
function takeTrace(): Promise<TraceEvent[]> {
  return new Promise((resolve) => {
    devTools.takeNativeAnimationTrace?.((events) => {
      clientReports.push(...events.filter(isClientReport));
      resolve(events.filter((event) => !isClientReport(event)));
    });
  });
}

async function takeTraceOf(tag: number) {
  return (await takeTrace()).filter((event) => event.tag === tag);
}

function sample(tag: number, target: string): Promise<TargetSample> {
  return new Promise((resolve, reject) => {
    devTools.sampleNativeAnimationTarget?.(tag, target, (targetSample) =>
      targetSample ? resolve(targetSample) : reject(new Error('no view'))
    );
  });
}

// The trace request runs on the UI thread after the arm request, so its answer proves that the arm is set.
async function takeTraceUntilSurfaceClosed(surfaceId: number) {
  const events: TraceEvent[] = [];
  const isClosed = () =>
    events.some(
      (event) =>
        event.event === 'SurfaceClosed' && event.surfaceId === surfaceId
    );
  for (let attempt = 0; attempt < 40 && !isClosed(); attempt++) {
    await wait(25);
    events.push(...(await takeTrace()));
  }
  return events;
}

async function arm(
  tag: number,
  { duration = DURATION, delay = 0, animatesOpacity = false, count = 1 } = {}
) {
  devTools.armNativeLayoutStart?.(tag, duration, delay, animatesOpacity, count);
  await takeTrace();
}

function summarize(events: TraceEvent[]) {
  return events
    .map(({ event, target, finished, outcome, reason }) =>
      [event, target, finished, outcome, reason]
        .filter((part) => part !== undefined)
        .join(':')
    )
    .join(' > ');
}

function Box({
  left,
  opacity = 1,
  hasOpacityFilter = false,
  refName = BOX_REF,
}: {
  left: number;
  opacity?: number;
  hasOpacityFilter?: boolean;
  refName?: string;
}) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      layout={LinearTransition.duration(FRAME_DRIVEN_DURATION)}
      style={[
        styles.box,
        { marginLeft: left, opacity },
        hasOpacityFilter && { filter: [{ opacity: FILTER_OPACITY }] },
      ]}
    />
  );
}

function Scene({
  left,
  opacity,
  hasOpacityFilter,
  isMounted = true,
}: {
  left: number;
  opacity?: number;
  hasOpacityFilter?: boolean;
  isMounted?: boolean;
}) {
  return (
    <View style={styles.container}>
      {isMounted && (
        <Box
          left={left}
          opacity={opacity}
          hasOpacityFilter={hasOpacityFilter}
        />
      )}
    </View>
  );
}

const ROW_REFS = Array.from(
  { length: 40 },
  (_, index) => `NativeLayoutStartRowBox${index}`
);

function Row({ left }: { left: number }) {
  return (
    <View style={styles.container}>
      {ROW_REFS.map((refName) => (
        <View key={refName} style={styles.rowItem}>
          <Box left={left} refName={refName} />
        </View>
      ))}
    </View>
  );
}

function ModalScene({ left }: { left: number }) {
  return (
    <Modal visible transparent animationType="none">
      <View style={styles.container}>
        <Box left={left} />
      </View>
    </Modal>
  );
}

const SECOND_BOX_REF = 'NativeLayoutStartSecondSurfaceBox';
const SECOND_CSS_BOX_REF = 'NativeLayoutStartSecondSurfaceCSSBox';
let setSecondSurfaceLeft: (left: number) => void = () => {};
let setSecondSurfaceOpacity: (opacity: number) => void = () => {};

function SecondSurfaceScene() {
  const [left, setLeft] = useState(START_LEFT);
  const [opacity, setOpacity] = useState(1);
  const cssBoxRef = useTestRef(SECOND_CSS_BOX_REF);
  setSecondSurfaceLeft = setLeft;
  setSecondSurfaceOpacity = setOpacity;
  return (
    <View style={styles.container}>
      <Box left={left} refName={SECOND_BOX_REF} />
      <Animated.View
        ref={cssBoxRef}
        style={[
          styles.box,
          {
            opacity,
            transitionProperty: 'opacity',
            transitionDuration: 4 * DURATION,
            transitionTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}

async function renderAndArm(options?: Parameters<typeof arm>[1]) {
  await render(<Scene left={START_LEFT} />);
  await wait(50);
  const tag = getTestComponent(BOX_REF).getTag();
  await arm(tag, options);
  return tag;
}

describe('native layout starts after the mount of the final state', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  test('the final state mounts before admission and the model holds the endpoint', async () => {
    const tag = await renderAndArm();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION / 2);

    const events = await takeTraceOf(tag);
    expect(summarize(events)).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Position > Admitted > FirstFrameSampled:Position'
    );
    expect(events[0].owner).toBe('Layout');
    expect(events[1].transactionNumber).toBe(events[0].transactionNumber);
    expect(events[3].endpointPolicy).toBe('MountedModelMustMatchEndpoint');

    const firstFrameX = events[5].presentationValue![0];
    expect(firstFrameX < centerOf(START_LEFT) + FIRST_FRAME_TRAVEL).toBe(true);

    const { model, presentation, monotonicTimeMs } = await sample(
      tag,
      'Position'
    );
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    const progress = (monotonicTimeMs - events[0].monotonicTimeMs) / DURATION;
    const expectedX = centerOf(START_LEFT) + progress * (END_LEFT - START_LEFT);
    expect(
      Math.abs(presentation[0] - expectedX) <
        FIRST_FRAME_TRAVEL + POSITION_TOLERANCE
    ).toBe(true);

    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:Position:true > Ended:Finished:None'
    );
    const end = await sample(tag, 'Position');
    expect(Math.abs(end.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(
      true
    );
    await render(null);
  });

  test('the start value stays on screen through the delay', async () => {
    const tag = await renderAndArm({ delay: DURATION });
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION / 2);

    const events = await takeTraceOf(tag);
    const firstFrame = events.find(
      (event) => event.event === 'FirstFrameSampled'
    );
    expect(
      Math.abs(firstFrame!.presentationValue![0] - centerOf(START_LEFT)) <
        POSITION_TOLERANCE
    ).toBe(true);

    const { model, presentation } = await sample(tag, 'Position');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(
      Math.abs(presentation[0] - centerOf(START_LEFT)) < POSITION_TOLERANCE
    ).toBe(true);

    await wait(DURATION * 2);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:Position:true > Ended:Finished:None'
    );
    await render(null);
  });

  test('one command plays position and opacity', async () => {
    const tag = await renderAndArm({ animatesOpacity: true });
    await render(<Scene left={END_LEFT} opacity={0.2} />);
    await wait(DURATION / 2);

    expect(
      summarize(
        (await takeTraceOf(tag)).filter(
          (event) => event.event !== 'FirstFrameSampled'
        )
      )
    ).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Position > TrackStarted:Opacity > Admitted'
    );
    const opacity = await sample(tag, 'Opacity');
    expect(Math.abs(opacity.model[0] - 0.2) < 0.01).toBe(true);
    expect(opacity.presentation[0] > 0.2).toBe(true);
    expect(opacity.presentation[0] < 1).toBe(true);

    await wait(DURATION);
    const endEvents = await takeTraceOf(tag);
    expect(
      endEvents
        .filter((event) => event.event === 'TrackEnded' && event.finished)
        .map((event) => event.target)
        .sort()
        .join()
    ).toBe('Opacity,Position');
    expect(summarize(endEvents.slice(2))).toBe('Ended:Finished:None');
    await render(null);
  });

  test('a second native start replaces the first one from the value on screen', async () => {
    const tag = await renderAndArm();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION / 2);
    const firstGeneration = (await takeTraceOf(tag))[0].generation;

    await arm(tag);
    await render(<Scene left={2 * END_LEFT} />);
    await wait(DURATION / 4);
    const events = await takeTraceOf(tag);
    expect(summarize(events)).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:Position:false > Ended:Interrupted:None > TrackStarted:Position > Admitted > FirstFrameSampled:Position'
    );
    expect(events[4].generation).toBe(firstGeneration);
    expect(events[5].generation).not.toBe(firstGeneration);
    const firstFrameX = events[7].presentationValue![0];
    expect(firstFrameX > centerOf(START_LEFT)).toBe(true);
    expect(firstFrameX < centerOf(END_LEFT)).toBe(true);

    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:Position:true > Ended:Finished:None'
    );
    await render(null);
  });

  test('the client gets the reports of two starts with no wait between them in admission order', async () => {
    const tag = await renderAndArm({ count: 2 });
    clientReports.length = 0;
    await render(<Scene left={END_LEFT} />);
    await render(<Scene left={2 * END_LEFT} />);
    await wait(DURATION * 1.5);
    await takeTrace();

    const reports = clientReports.filter((event) => event.tag === tag);
    expect(summarize(reports)).toBe(
      'ClientAdmitted > ClientEnded:Interrupted:None > ClientAdmitted > ClientEnded:Finished:None'
    );
    expect(reports[1].generation).toBe(reports[0].generation);
    expect(reports[2].generation).toBe(reports[0].generation + 1);
    expect(reports[3].generation).toBe(reports[2].generation);
    await render(null);
  });

  test('the removal of the view ends the command one time', async () => {
    const tag = await renderAndArm();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION / 4);
    await takeTraceOf(tag);

    await render(<Scene left={END_LEFT} isMounted={false} />);
    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:Position:false > Ended:Interrupted:PlatformRemoved'
    );
    await render(null);
  });

  test('the removal of the view right after its start ends the command one time', async () => {
    const tag = await renderAndArm();
    await render(<Scene left={END_LEFT} />);
    await render(<Scene left={END_LEFT} isMounted={false} />);
    await wait(DURATION);
    const ends = (await takeTraceOf(tag)).filter(
      (event) => event.event === 'Ended'
    );
    expect(summarize(ends)).toBe('Ended:Interrupted:PlatformRemoved');
    await render(null);
  });

  test('a later commit with no layout change keeps the playback and the endpoint', async () => {
    const tag = await renderAndArm();
    await render(<Scene left={END_LEFT} />);
    await render(<Scene left={END_LEFT} opacity={0.5} />);
    await wait(DURATION / 2);
    expect(
      summarize(
        (await takeTraceOf(tag)).filter(
          (event) => event.event !== 'FirstFrameSampled'
        )
      )
    ).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Position > Admitted'
    );
    const { model, presentation } = await sample(tag, 'Position');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(presentation[0] < centerOf(END_LEFT)).toBe(true);

    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:Position:true > Ended:Finished:None'
    );
    await render(null);
  });

  test('a model that differs from the endpoint rejects the command before its start', async () => {
    await render(<Scene left={START_LEFT} opacity={1} hasOpacityFilter />);
    await wait(50);
    const tag = getTestComponent(BOX_REF).getTag();
    await arm(tag, { animatesOpacity: true });
    await render(<Scene left={END_LEFT} opacity={0.4} hasOpacityFilter />);
    await wait(DURATION / 2);

    expect(summarize(await takeTraceOf(tag))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > Ended:Rejected:EndpointMismatch'
    );
    const opacity = await sample(tag, 'Opacity');
    expect(Math.abs(opacity.model[0] - 0.4 * FILTER_OPACITY) < 0.01).toBe(true);
    expect(Math.abs(opacity.presentation[0] - opacity.model[0]) < 0.01).toBe(
      true
    );
    const position = await sample(tag, 'Position');
    expect(Math.abs(position.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(
      true
    );
    await render(null);
  });

  test('an opacity filter rejects an opacity track whose endpoint matches', async () => {
    await render(<Scene left={START_LEFT} opacity={1} hasOpacityFilter />);
    await wait(50);
    const tag = getTestComponent(BOX_REF).getTag();
    await arm(tag, { animatesOpacity: true });
    await render(<Scene left={END_LEFT} opacity={0} hasOpacityFilter />);
    await wait(DURATION / 2);

    expect(summarize(await takeTraceOf(tag))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > Ended:Rejected:UnsupportedRealization'
    );
    await render(null);
  });

  test('a cancel shows the mounted state with no later commit', async () => {
    const tag = await renderAndArm({ duration: 4 * DURATION });
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION);
    await takeTraceOf(tag);

    devTools.cancelNativeLayoutCommand?.(tag);
    await wait(50);
    const events = await takeTraceOf(tag);
    expect(summarize(events)).toBe(
      'TrackEnded:Position:false > Ended:Cancelled:None'
    );
    const { model, presentation } = await sample(tag, 'Position');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(Math.abs(presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(true);

    await wait(DURATION);
    expect((await takeTraceOf(tag)).length).toBe(0);
    await render(null);
  });

  test('the first frame-driven update after a native command is identified at its mount', async () => {
    const tag = await renderAndArm();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION * 1.5);
    const nativeGeneration = (await takeTraceOf(tag))[0].generation;

    await render(<Scene left={START_LEFT} />);
    await wait(FRAME_DRIVEN_DURATION * 2);
    const events = await takeTraceOf(tag);
    expect(summarize(events)).toBe('FrameUpdateMounted:Position');
    expect(events[0].generation).toBe(nativeGeneration);
    expect(events[0].target).toBe('Position');
    expect(events[0].transactionNumber !== undefined).toBe(true);
    await render(null);
  });

  test('the first frame after each mount shows the start value', async () => {
    const tag = await renderAndArm();
    let left = START_LEFT;
    for (let run = 0; run < REPEATED_STARTS; run++) {
      const startCenter = centerOf(left);
      left = left === START_LEFT ? END_LEFT : START_LEFT;
      await render(<Scene left={left} />);
      await wait(DURATION + 50);
      const firstFrame = (await takeTraceOf(tag)).find(
        (event) => event.event === 'FirstFrameSampled'
      );
      expect(
        Math.abs(firstFrame!.presentationValue![0] - startCenter) <
          FIRST_FRAME_TRAVEL
      ).toBe(true);
      await arm(tag);
    }
    await render(null);
  });

  test('all starts of one mount use one time origin', async () => {
    await render(<Row left={START_LEFT} />);
    await wait(50);
    const tags = ROW_REFS.map((refName) => getTestComponent(refName).getTag());
    for (const tag of tags) {
      devTools.armNativeLayoutStart?.(tag, 4 * DURATION, 0, false, 1);
    }
    await takeTrace();
    await render(<Row left={END_LEFT} />);
    await wait(DURATION);

    const events = await takeTrace();
    const mounted = events.filter(
      (event) => event.event === 'LayoutStartMounted'
    );
    expect(mounted.length).toBe(tags.length);
    expect(new Set(mounted.map((event) => event.transactionNumber)).size).toBe(
      1
    );
    const firstFrames = events
      .filter((event) => event.event === 'FirstFrameSampled')
      .map((event) => event.presentationValue![0]);
    expect(firstFrames.length).toBe(tags.length);
    expect(
      Math.max(...firstFrames) - Math.min(...firstFrames) < POSITION_TOLERANCE
    ).toBe(true);
    await render(null);
  });

  test('a view in a Modal starts after its mount', async () => {
    await render(<ModalScene left={START_LEFT} />);
    await wait(300);
    const tag = getTestComponent(BOX_REF).getTag();
    await arm(tag);
    await render(<ModalScene left={END_LEFT} />);
    await wait(DURATION / 2);

    expect(
      summarize(
        (await takeTraceOf(tag)).filter(
          (event) => event.event !== 'FirstFrameSampled'
        )
      )
    ).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:Position > Admitted'
    );
    const { model, presentation } = await sample(tag, 'Position');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(presentation[0] < centerOf(END_LEFT)).toBe(true);

    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:Position:true > Ended:Finished:None'
    );
    await render(null);
    await wait(300);
  });
});

describe('native layout starts on two surfaces', () => {
  if (!hasNativeLayoutStarts || !isSecondSurfaceAvailable()) {
    return;
  }

  test('each surface starts its own command', async () => {
    const tag = await renderAndArm();
    const secondSurfaceId = await startSecondSurface(SecondSurfaceScene);
    const secondTag = getTestComponent(SECOND_BOX_REF).getTag();
    await arm(secondTag);

    await render(<Scene left={END_LEFT} />);
    setSecondSurfaceLeft(END_LEFT);
    await wait(DURATION * 1.5);

    const events = (await takeTrace()).filter(
      (event) => event.owner === 'Layout' && event.event === 'Ended'
    );
    const first = events.find((event) => event.tag === tag);
    const second = events.find((event) => event.tag === secondTag);
    expect(first!.outcome).toBe('Finished');
    expect(second!.outcome).toBe('Finished');
    expect(second!.surfaceId).toBe(secondSurfaceId);
    expect(first!.surfaceId).not.toBe(secondSurfaceId);

    await stopSecondSurface(secondSurfaceId);
    await render(null);
  });

  test('the stop of a surface ends its active command one time and no other command', async () => {
    const tag = await renderAndArm({ duration: 4 * DURATION });
    const secondSurfaceId = await startSecondSurface(SecondSurfaceScene);
    const secondTag = getTestComponent(SECOND_BOX_REF).getTag();
    const cssTag = getTestComponent(SECOND_CSS_BOX_REF).getTag();
    await arm(secondTag, { duration: 4 * DURATION });

    await render(<Scene left={END_LEFT} />);
    setSecondSurfaceLeft(END_LEFT);
    setSecondSurfaceOpacity(0.2);
    await wait(DURATION);
    await takeTrace();

    await stopSecondSurface(secondSurfaceId);
    const events = await takeTraceUntilSurfaceClosed(secondSurfaceId);
    expect(
      summarize(events.filter((event) => event.event === 'SurfaceClosed'))
    ).toBe('SurfaceClosed');
    expect(summarize(events.filter((event) => event.tag === secondTag))).toBe(
      'TrackEnded:Position:false > Ended:SurfaceDestroyed:None'
    );
    if (getStaticFeatureFlag('IOS_CSS_CORE_ANIMATION')) {
      expect(summarize(events.filter((event) => event.tag === cssTag))).toBe(
        'TrackEnded:Opacity:false > Ended:SurfaceDestroyed:None'
      );
    }
    expect(events.filter((event) => event.tag === tag).length).toBe(0);

    await wait(4 * DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:Position:true > Ended:Finished:None'
    );
    expect((await takeTraceOf(secondTag)).length).toBe(0);
    await render(null);
  });
});

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 100,
  },
  rowItem: {
    height: 2,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
});
