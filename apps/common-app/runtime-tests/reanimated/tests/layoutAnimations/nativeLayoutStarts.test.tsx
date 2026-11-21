import { Platform, StyleSheet, View } from 'react-native';
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
});

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 100,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
});
