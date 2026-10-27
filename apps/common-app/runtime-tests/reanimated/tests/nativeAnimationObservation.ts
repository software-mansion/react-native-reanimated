import React from 'react';
import { Platform, View } from 'react-native';
import { runOnUISync } from 'react-native-worklets';

import {
  getTestComponent,
  render,
  useTestRef,
  waitForFrames,
} from '../../ReJest/RuntimeTestsApi';

/**
 * The observation contract of the native animation host. Each runtime-test
 * build has the two test hooks; a production build has none.
 */
export type TraceEvent = {
  schemaVersion: number;
  sequence: number;
  /** On the trace clock. */
  monotonicTimeMs: number;
  event: string;
  surfaceId: number;
  tag: number;
  owner: string;
  generation: number;
  objective: number;
  target?: string;
  endpointPolicy?: string;
  finished?: boolean;
  outcome?: string;
  reason?: string;
  buildFailure?: string;
  transactionNumber?: number;
  /** Of a `Received` event: the start of the timelines on the animation clock. */
  originTimestampMs?: number;
  leafValue?: number;
  layoutAnimationType?: string;
};

/** A command of the host that has a physical playback of a target on the view. */
export type Playback = {
  surfaceId: number;
  tag: number;
  owner: string;
  generation: number;
  target: string;
};

export type TargetSample = {
  model: number[];
  /** The model, when the view has no value on screen yet. */
  presentation: number[];
  playbacks: Playback[];
  /** On the trace clock, after the read. */
  monotonicTimeMs: number;
};

/**
 * One physical animation of the playback of a target. It has its value at the
 * start and at the end of each segment, and the time of each value as a part of
 * its duration.
 */
export type PlaybackMember = {
  property: string;
  values: number[][];
  keyTimes: number[];
};

/**
 * The sample of a platform: the physical animations of the playback of the
 * target, in the order in which the platform applies them.
 */
export type PlatformTargetSample = TargetSample & { members: PlaybackMember[] };

export type AppleTargetSample = PlatformTargetSample & {
  /** The view is allowed to antialias its edges. */
  edgeAntialiasing: boolean;
};

/**
 * One member for each physical timeline, in the order of the writer: `alpha`,
 * `position.x`, `position.y`, `hold`, or `transform.<operation>` for each
 * operation of a transform in list order.
 */
export type AndroidTargetSample = PlatformTargetSample;

/** `ReanimatedModuleProxy::nativeAnimationRoutes`: the routes of the build. */
export type NativeAnimationRoutes = {
  /** The host exists: the CSS flag or the route flag of the platform is on. */
  hasHost: boolean;
  /** The CSS backend is on the host. */
  cssTransitions: boolean;
  /**
   * `configured`: the route flag is on and the proxy is not the Legacy one, but
   * React commits do not pull in the mount of their transaction.
   */
  layoutRoute: 'off' | 'configured' | 'admitted';
  synchronousProps: boolean;
  /** Android: the API level of the device. Apple: null. */
  apiLevel: number | null;
};

/**
 * `ReanimatedModuleProxy::nativeAnimationContainerSizes`: the number of entries
 * of each container, by name (`host.commands`, `host.platform.tracks`,
 * `registry.proxies.layoutAnimations`, `manager.enteringAnimations` and the
 * others). The names of the platform containers differ between Apple and
 * Android. The host reads all containers in one of its operations.
 */
export type NativeAnimationContainerSizes = Readonly<Record<string, number>>;

type NativeAnimationTestHooks = {
  takeNativeAnimationTrace: (callback: (events: TraceEvent[]) => void) => void;
  sampleNativeAnimationTarget: (
    tag: number,
    target: string,
    callback: (sample: TargetSample | undefined) => void
  ) => void;
  nativeAnimationRoutes: () => NativeAnimationRoutes;
  nativeAnimationContainerSizes: (
    callback: (sizes: NativeAnimationContainerSizes | undefined) => void
  ) => void;
};

export const NATIVE_ANIMATION_TEST_HOOKS: (keyof NativeAnimationTestHooks)[] = [
  'takeNativeAnimationTrace',
  'sampleNativeAnimationTarget',
  'nativeAnimationRoutes',
  'nativeAnimationContainerSizes',
];

export function testHookOf<TName extends keyof NativeAnimationTestHooks>(
  name: TName
): NativeAnimationTestHooks[TName] {
  const hook = (
    globalThis as unknown as {
      __reanimatedModuleProxy: Partial<NativeAnimationTestHooks>;
    }
  ).__reanimatedModuleProxy[name];
  if (hook === undefined) {
    throw new Error(`The native animation test hook ${name} is missing.`);
  }
  return hook;
}

/**
 * The number of layout animation builds on the UI runtime that wait for their
 * frame-driven start or their release.
 */
export function pendingBuildCountOf(): number {
  return runOnUISync(() => {
    'worklet';
    const { pendingBuildCount } = global.LayoutAnimationsManager;
    if (pendingBuildCount === undefined) {
      throw new Error(
        'The layout animations manager has no method pendingBuildCount.'
      );
    }
    return pendingBuildCount();
  });
}

/** One read at module load: the routes are fixed for the build. */
export const NATIVE_ANIMATION_ROUTES: NativeAnimationRoutes = testHookOf(
  'nativeAnimationRoutes'
)();

/** CSS transitions play on the native animation host. */
export const hasNativeCSSTransitions = NATIVE_ANIMATION_ROUTES.cssTransitions;

/** Each flag of a native route creates the native animation host. */
export const hasNativeAnimationHost = NATIVE_ANIMATION_ROUTES.hasHost;

/**
 * The timing kinds of the CSS route table of the platform:
 * `makeCoreAnimationRouteTable` (REACSSPlatformRouteTable.mm) and
 * `makeAndroidCSSRouteTable` (AndroidCSSRouteTable.cpp).
 */
export const CSS_HOST_TIMING_KINDS: readonly string[] =
  Platform.OS === 'android'
    ? ['linear', 'cubicBezier', 'steps', 'linear()']
    : ['linear', 'cubicBezier'];

/** Layout animations start native playback. */
export const hasNativeLayoutRoute =
  NATIVE_ANIMATION_ROUTES.layoutRoute === 'admitted';

/**
 * The build configures the native layout route. With no mount-thread pull it
 * admits no native start.
 */
export const isNativeLayoutRouteConfigured =
  NATIVE_ANIMATION_ROUTES.layoutRoute !== 'off';

/** The events of the host since the last take. The host keeps the newest 1024. */
export function takeTrace(): Promise<TraceEvent[]> {
  const take = testHookOf('takeNativeAnimationTrace');
  return new Promise((resolve) => take(resolve));
}

/** Rejects when the build has no native animation host. */
export function containerSizes(): Promise<NativeAnimationContainerSizes> {
  const read = testHookOf('nativeAnimationContainerSizes');
  return new Promise((resolve, reject) => {
    read((sizes) =>
      sizes
        ? resolve(sizes)
        : reject(new Error('The build has no native animation host.'))
    );
  });
}

const NO_VIEW = 'no view';

/** `TPlatformSample` is the sample type of the platform of the build. */
export function sample<TPlatformSample extends TargetSample = TargetSample>(
  tag: number,
  target: string
): Promise<TPlatformSample> {
  const read = testHookOf('sampleNativeAnimationTarget');
  return new Promise((resolve, reject) => {
    read(tag, target, (targetSample) =>
      targetSample
        ? resolve(targetSample as TPlatformSample)
        : reject(new Error(NO_VIEW))
    );
  });
}

export const isNoView = (error: unknown) =>
  error instanceof Error && error.message === NO_VIEW;

const HOST_PROBE_REF = 'NativeAnimationHostProbe';

function HostProbe() {
  return React.createElement(View, {
    ref: useTestRef(HOST_PROBE_REF),
    collapsable: false,
    style: { width: 10, height: 10 },
  });
}

const PROBE_MOUNT_FRAMES = 10;

/**
 * The flags of the build create a native animation host
 * (`hasNativeAnimationHost`). Then the host must sample the probe view, else
 * the test fails. On Android the view can mount one frame after `render`
 * resolves, so the probe asks once per frame. Renders a probe view, so the next
 * render mounts its scene again.
 */
export async function nativeAnimationHostExists(): Promise<boolean> {
  await render(React.createElement(HostProbe));
  if (!hasNativeAnimationHost) {
    console.log('NativeAnimationHost none: the host asserts do not run');
    return false;
  }
  const probeTag = getTestComponent(HOST_PROBE_REF).getTag();
  for (let frame = 0; frame < PROBE_MOUNT_FRAMES; frame++) {
    if (await samplesView(probeTag)) {
      return true;
    }
    await waitForFrames(1);
  }
  throw new Error(
    `The flags of the build create the native animation host, but it samples no probe view in ${PROBE_MOUNT_FRAMES} frames.`
  );
}

const samplesView = (tag: number) =>
  sample(tag, 'Opacity').then(
    () => true,
    (error: unknown) => {
      if (isNoView(error)) {
        return false;
      }
      throw error;
    }
  );

/** The platform gives the playbacks of a sample in no fixed order. */
export const playbackIdsOf = ({ playbacks }: Pick<TargetSample, 'playbacks'>) =>
  playbacks.map(playbackIdOf).sort();

export const playbackIdOf = ({
  surfaceId,
  tag,
  owner,
  generation,
  target,
}: Playback) => `${owner} ${surfaceId}.${tag}.${generation} ${target}`;

export type CommandHandle = Pick<
  TraceEvent,
  'surfaceId' | 'tag' | 'owner' | 'generation'
>;

export type Route =
  | { kind: 'native playing'; command: CommandHandle }
  | { kind: 'native immediate'; command: CommandHandle }
  | { kind: 'frame-driven'; refusal: TraceEvent };

export const isOfCommand = (
  event: CommandHandle,
  { surfaceId, tag, owner, generation }: CommandHandle
) =>
  event.surfaceId === surfaceId &&
  event.tag === tag &&
  event.owner === owner &&
  event.generation === generation;

const isRefusal = ({ event, outcome }: TraceEvent) =>
  event === 'LayoutBuildFailed' ||
  event === 'LayoutStartRefused' ||
  (event === 'Ended' && outcome === 'Rejected');

/**
 * The route of the last start of a target of a view, from one trace take after
 * the start and the samples of the target after it. The last start is the later
 * of the last `TrackStarted` of the target and the last refusal of a start of
 * the view. A frame-driven start needs two samples whose models differ and are
 * each on the declared timeline of the frame driver: `isOnFrameDriverTimeline`
 * gets the sample and its time from the refusal. Each other evidence throws.
 */
export function routeOf<TSample extends TargetSample>(
  events: TraceEvent[],
  tag: number,
  target: string,
  samples: TSample[],
  isOnFrameDriverTimeline?: FrameDriverCheck<TSample>
): Route {
  const ofView = events
    .filter((event) => event.tag === tag)
    .sort((first, second) => first.sequence - second.sequence);
  const start = lastOf(
    ofView.filter(
      (event) =>
        isRefusal(event) ||
        (event.event === 'TrackStarted' && event.target === target)
    )
  );
  if (!start) {
    throw new Error(
      `${describeEvidence(ofView, samples)}: no start of ${target} of the view ${tag}.`
    );
  }
  return isRefusal(start)
    ? frameDrivenRouteOf(ofView, start, samples, isOnFrameDriverTimeline)
    : nativeRouteOf(events, ofView, start, lastOf(samples));
}

type FrameDriverCheck<TSample> = (
  sample: TSample,
  sinceRefusalMs: number
) => boolean;

function frameDrivenRouteOf<TSample extends TargetSample>(
  ofView: TraceEvent[],
  refusal: TraceEvent,
  samples: TSample[],
  isOnFrameDriverTimeline?: FrameDriverCheck<TSample>
): Route {
  if (!isOnFrameDriverTimeline) {
    throw new Error(
      `The view ${refusal.tag} has the refusal ${refusal.event}: a frame-driven route needs the declared timeline of the frame driver.`
    );
  }
  const models = samples.map(({ model }) => model.join());
  const isMoving =
    samples.length >= 2 &&
    new Set(models).size === models.length &&
    samples.every((sample) =>
      isOnFrameDriverTimeline(
        sample,
        sample.monotonicTimeMs - refusal.monotonicTimeMs
      )
    );
  const isAdmittedLater = ofView.some(
    ({ event, sequence }) => event === 'Admitted' && sequence > refusal.sequence
  );
  const hasPlayback = samples.some(({ playbacks }) => playbacks.length > 0);
  if (!isMoving || isAdmittedLater || hasPlayback) {
    throw new Error(
      `${describeEvidence(ofView, samples)}: the view ${refusal.tag} has the refusal ${refusal.event}, but the trace and the samples (at ${samples.map(({ monotonicTimeMs }) => (monotonicTimeMs - refusal.monotonicTimeMs).toFixed(2)).join(', ')} ms after the refusal) do not show the frame driver at work on the declared timeline with no native command.`
    );
  }
  return { kind: 'frame-driven', refusal };
}

/**
 * The host records `Admitted` and then, in the same operation, the end of each
 * immediate track of the command (`NativeAnimationHost::runStart`): these ends
 * are the events that follow `Admitted` in the sequence with no other event
 * between.
 */
function nativeRouteOf(
  events: TraceEvent[],
  ofView: TraceEvent[],
  started: TraceEvent,
  lastSample: TargetSample | undefined
): Route {
  const command = commandOf(started);
  const { target } = started;
  const describe = (fault: string) =>
    `${describeEvidence(ofView, lastSample ? [lastSample] : [])}: the command ${playbackIdOf({ ...command, target: target! })} ${fault}.`;
  const admitted = ofView.find(
    (event) =>
      event.event === 'Admitted' &&
      isOfCommand(event, command) &&
      event.sequence > started.sequence
  );
  if (!admitted) {
    throw new Error(describe('started its track and has no Admitted event'));
  }
  if (!lastSample) {
    throw new Error(describe('has no sample of its target'));
  }
  const ofCommand = lastSample.playbacks.filter((playback) =>
    isOfCommand(playback, command)
  );
  if (ofCommand.some((playback) => playback.target === target)) {
    return { kind: 'native playing', command };
  }
  const bySequence = new Map(events.map((event) => [event.sequence, event]));
  const immediateEnds: TraceEvent[] = [];
  for (
    let next = bySequence.get(admitted.sequence + 1);
    next?.event === 'TrackEnded' && isOfCommand(next, command);
    next = bySequence.get(next.sequence + 1)
  ) {
    immediateEnds.push(next);
  }
  if (
    ofCommand.length === 0 &&
    immediateEnds.some((end) => end.target === target && end.finished === true)
  ) {
    return { kind: 'native immediate', command };
  }
  throw new Error(
    describe(
      'was admitted, but it has no playback of its target and no immediate end of it'
    )
  );
}

const commandOf = ({
  surfaceId,
  tag,
  owner,
  generation,
}: CommandHandle): CommandHandle => ({ surfaceId, tag, owner, generation });

const lastOf = <TItem>(items: TItem[]): TItem | undefined =>
  items[items.length - 1];

const describeEvidence = (events: TraceEvent[], samples: TargetSample[]) =>
  `Events [${events
    .map(({ event, target, finished, outcome, reason, buildFailure }) =>
      [event, target, finished, outcome, reason, buildFailure]
        .filter((part) => part !== undefined)
        .join(':')
    )
    .join(' > ')}], samples [${samples
    .map(
      (targetSample) =>
        `model ${targetSample.model.map((value) => value.toFixed(3)).join(' ')} playbacks ${playbackIdsOf(targetSample).join(', ')}`
    )
    .join('; ')}]`;
