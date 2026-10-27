/*
 * Method: a test of a preset with a native route plays the preset as a case of the player of `native layout
 * reference`, with the leaves and the transform operations that the source of the preset declares. Each
 * sample of the native box is on the declared timeline of its key at its own sample time (statement A), and
 * each frame of the frame-driven twin is on a replay of the declared timeline (statement B). The busy test
 * has the two statements and a gap in the frame record of the twin. A test of a plain number has the two
 * statements for the opacity and a state check of the X at its planned parts. Each other statement is a
 * trace check or a state check at the end. The boxes of a played preset have no style transform. At the
 * end, each target of the native box is at rest and has the model of the twin, or the two views left.
 *
 * Not proved: the distance of the two boxes at one instant, the lag of the frame driver, the route of the
 * twin in a played case. Pixels, a device, and 120 Hz are not tested.
 *
 * Not converted (the old pair comparison at the frames of the frame driver, `expectAsTwin`): the presets
 * that stay frame-driven. FlipIn has no played case, the kit has no matrix of `skewX`, and
 * EntryExitTransition has no leaves of the kit.
 */
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import type {
  BaseAnimationBuilder,
  LayoutAnimation,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  BounceIn,
  BounceInDown,
  BounceInLeft,
  BounceInRight,
  BounceInUp,
  BounceOut,
  BounceOutDown,
  BounceOutLeft,
  BounceOutRight,
  BounceOutUp,
  CurvedTransition,
  EntryExitTransition,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
  FadingTransition,
  FlipInEasyX,
  FlipInEasyY,
  FlipInXDown,
  FlipInXUp,
  FlipInYLeft,
  FlipInYRight,
  FlipOutEasyX,
  FlipOutEasyY,
  FlipOutXDown,
  FlipOutXUp,
  FlipOutYLeft,
  FlipOutYRight,
  JumpingTransition,
  Keyframe,
  LightSpeedInLeft,
  LightSpeedInRight,
  LightSpeedOutLeft,
  LightSpeedOutRight,
  LinearTransition,
  PinwheelIn,
  PinwheelOut,
  RollInLeft,
  RollInRight,
  RollOutLeft,
  RollOutRight,
  RotateInDownLeft,
  RotateInDownRight,
  RotateInUpLeft,
  RotateInUpRight,
  RotateOutDownLeft,
  RotateOutDownRight,
  RotateOutUpLeft,
  RotateOutUpRight,
  SequencedTransition,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  SlideOutDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
  StretchInX,
  StretchInY,
  StretchOutX,
  StretchOutY,
  ZoomIn,
  ZoomInDown,
  ZoomInEasyDown,
  ZoomInEasyUp,
  ZoomInLeft,
  ZoomInRight,
  ZoomInRotate,
  ZoomInUp,
  ZoomOut,
  ZoomOutDown,
  ZoomOutEasyDown,
  ZoomOutEasyUp,
  ZoomOutLeft,
  ZoomOutRight,
  ZoomOutRotate,
  ZoomOutUp,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { blockUIThread } from './nativeLayoutLoad';
import type {
  CallbackBuilder,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import { expectReference, play } from './nativeLayoutReferencePlay';
import type {
  FrameDriverRow,
  Key,
  Leaf,
  LeafPart,
  Leaves,
  Operation,
  SizeBoxProps,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  centerOf,
  countedOf,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  HAS_EDGE_ANTIALIASING,
  hasNativeLayoutRoute,
  isHostEvent,
  isNoView,
  middleOf,
  namedBuilderCalls,
  PLAYS_3D_OPERATIONS,
  movesGeometryOf,
  PLAYS_MOVING_GEOMETRY,
  PLAYS_SIZE_CHANGE,
  sample,
  SizeBox,
  summarize,
  takeAtFrameDriverFrame,
  takeTrace,
  takeTraceUntil,
  waitForCallbacks,
} from './nativeLayoutTestKit';

type Flow = 'entering' | 'exiting' | 'layout';
type EntryExit = Exclude<Flow, 'layout'>;
type Builder = BaseAnimationBuilder & {
  build: () => (values: never) => LayoutAnimation;
};
type Preset = new () => Builder;
type BoxAnimations = Pick<React.ComponentProps<typeof Animated.View>, Flow>;
type BoxFrame = { left: number; top: number; width: number; height: number };

const DURATION = 1200;
const DELAY = 300;
const CELL_HEIGHT = 160;
const REST: BoxFrame = { left: 60, top: 20, width: 50, height: 50 };
const MOVED: BoxFrame = { left: 150, top: 60, width: 90, height: 70 };
const widerBy = (change: number): BoxFrame => ({
  ...REST,
  width: REST.width + change,
});
const WINDOW = Dimensions.get('window');
const AT_REST = { opacity: 0.01, points: 0.5, cells: 0.005 };
const NATIVE_TIMING = 'UnsupportedTiming';

type Declared = Pick<ReferenceCase, 'leaves' | 'operations'>;

/**
 * What a preset declares when each of its timings has `timing`: the duration,
 * the easing, and the `withDelay` wrappers.
 */
type Declare = (timing: Leaf) => Declared;
type OperationEnds = [kind: string, from: number | string, to: number | string];
type Offsets = Pick<Leaf, 'initial' | 'to'>;

const declare =
  ({
    opacity,
    originX,
    originY,
    operations = [],
  }: {
    opacity?: [from: number, to: number];
    originX?: Offsets;
    originY?: Offsets;
    operations?: OperationEnds[];
  }): Declare =>
  (timing) => ({
    leaves: {
      ...(opacity && {
        opacity: { ...timing, initial: opacity[0], to: opacity[1] },
      }),
      ...(originX && { originX: { ...timing, ...originX } }),
      ...(originY && { originY: { ...timing, ...originY } }),
    },
    ...(operations.length > 0 && {
      operations: operations.map(
        ([kind, from, to]): Operation => [kind, from, to, timing]
      ),
    }),
  });

const transformOf = (...operations: OperationEnds[]) => declare({ operations });
const fadeInWith = (...operations: OperationEnds[]) =>
  declare({ opacity: [0, 1], operations });
const fadeOutWith = (...operations: OperationEnds[]) =>
  declare({ opacity: [1, 0], operations });

// The translations of a Rotate preset are the half of the width minus the half of the height: none for `REST`.
const rotateInFrom = (angle: string) =>
  fadeInWith(
    ['rotate', angle, '0deg'],
    ['translateX', 0, 0],
    ['translateY', 0, 0]
  );
const rotateOutTo = (angle: string) =>
  fadeOutWith(
    ['rotate', '0deg', angle],
    ['translateX', 0, 0],
    ['translateY', 0, 0]
  );
const PERSPECTIVE: OperationEnds = ['perspective', 500, 500];

/**
 * One timing of a sequence: where it ends, its part of `DURATION`, and its
 * easing when that is not the default easing. The last timing ends at the end
 * value of the leaf.
 */
type SequencePart = [
  end: Pick<LeafPart, 'to' | 'level'>,
  fraction: number,
  easing?: LeafPart['easing'],
];

function sequenceOf({ delays }: Leaf, parts: SequencePart[]): Leaf {
  const timings = parts.map(
    ([end, fraction, easing = 'default']): LeafPart => ({
      ...end,
      duration: fraction * DURATION,
      easing,
    })
  );
  const { duration, easing } = timings[timings.length - 1];
  return { delays, via: timings.slice(0, -1), duration, easing };
}

const BOUNCE_IN = [0.55, 0.15, 0.15, 0.15];
const BOUNCE_OUT = [0.15, 0.15, 0.15, 0.55];

const bounceOf =
  (kind: string, fractions: number[], [start, ...ends]: number[]): Declare =>
  (timing) => ({
    leaves: {},
    operations: [
      [
        kind,
        start,
        ends[ends.length - 1],
        sequenceOf(
          timing,
          ends.map((to, index): SequencePart => [{ to }, fractions[index]])
        ),
      ],
    ],
  });

type PresetRow = [
  Preset,
  /**
   * The route of the preset with its default easing: the targets of the native
   * tracks, or the failure that keeps the animation frame-driven.
   */
  string,
  /** No value: the preset stays frame-driven, and its test is not converted. */
  Declare?,
  /**
   * The animation with the duration of the rows, when `duration` does not set
   * it.
   */
  (() => Builder)?,
];

/** The leaves and the operations of each preset, from its source. */
const ENTERING: PresetRow[] = [
  [FadeIn, 'Opacity', fadeInWith()],
  [FadeInRight, 'Opacity+Transform', fadeInWith(['translateX', 25, 0])],
  [FadeInLeft, 'Opacity+Transform', fadeInWith(['translateX', -25, 0])],
  [FadeInUp, 'Opacity+Transform', fadeInWith(['translateY', -25, 0])],
  [FadeInDown, 'Opacity+Transform', fadeInWith(['translateY', 25, 0])],
  [SlideInRight, 'PositionX', declare({ originX: { initial: WINDOW.width } })],
  [SlideInLeft, 'PositionX', declare({ originX: { initial: -WINDOW.width } })],
  [
    SlideInUp,
    'PositionY',
    declare({ originY: { initial: -WINDOW.height - REST.top } }),
  ],
  [SlideInDown, 'PositionY', declare({ originY: { initial: WINDOW.height } })],
  [StretchInX, 'Transform', transformOf(['scaleX', 0, 1])],
  [StretchInY, 'Transform', transformOf(['scaleY', 0, 1])],
  [ZoomIn, 'Transform', transformOf(['scale', 0, 1])],
  [
    ZoomInRotate,
    'Transform',
    transformOf(['scale', 0, 1], ['rotate', '0.3rad', '0rad']),
  ],
  [
    ZoomInLeft,
    'Transform',
    transformOf(['translateX', -WINDOW.width, 0], ['scale', 0, 1]),
  ],
  [
    ZoomInRight,
    'Transform',
    transformOf(['translateX', WINDOW.width, 0], ['scale', 0, 1]),
  ],
  [
    ZoomInUp,
    'Transform',
    transformOf(['translateY', -WINDOW.height, 0], ['scale', 0, 1]),
  ],
  [
    ZoomInDown,
    'Transform',
    transformOf(['translateY', WINDOW.height, 0], ['scale', 0, 1]),
  ],
  [
    ZoomInEasyUp,
    'Transform',
    transformOf(['translateY', -REST.height, 0], ['scale', 0, 1]),
  ],
  [
    ZoomInEasyDown,
    'Transform',
    transformOf(['translateY', REST.height, 0], ['scale', 0, 1]),
  ],
  [RotateInDownLeft, 'Opacity+Transform', rotateInFrom('-90deg')],
  [RotateInDownRight, 'Opacity+Transform', rotateInFrom('90deg')],
  [RotateInUpLeft, 'Opacity+Transform', rotateInFrom('90deg')],
  [RotateInUpRight, 'Opacity+Transform', rotateInFrom('-90deg')],
  [
    RollInLeft,
    'Transform',
    transformOf(
      ['translateX', -WINDOW.width, 0],
      ['rotate', '-180deg', '0deg']
    ),
  ],
  [
    RollInRight,
    'Transform',
    transformOf(['translateX', WINDOW.width, 0], ['rotate', '180deg', '0deg']),
  ],
  [
    PinwheelIn,
    'Opacity+Transform',
    fadeInWith(['scale', 0, 1], ['rotate', '5rad', '0rad']),
  ],
  [FlipInXUp, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInXDown, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInYLeft, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInYRight, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInEasyX, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInEasyY, 'LayoutBuildFailed:EndpointMismatch'],
  [LightSpeedInRight, 'LayoutBuildFailed:UnsupportedValue'],
  [LightSpeedInLeft, 'LayoutBuildFailed:UnsupportedValue'],
  [BounceIn, 'Transform', bounceOf('scale', BOUNCE_IN, [0, 1.2, 0.9, 1.1, 1])],
  [
    BounceInDown,
    'Transform',
    bounceOf('translateY', BOUNCE_IN, [WINDOW.height, -20, 10, -10, 0]),
  ],
  [
    BounceInUp,
    'Transform',
    bounceOf('translateY', BOUNCE_IN, [-WINDOW.height, 20, -10, 10, 0]),
  ],
  [
    BounceInLeft,
    'Transform',
    bounceOf('translateX', BOUNCE_IN, [-WINDOW.width, 20, -10, 10, 0]),
  ],
  [
    BounceInRight,
    'Transform',
    bounceOf('translateX', BOUNCE_IN, [WINDOW.width, -20, 10, -10, 0]),
  ],
];

// The end of a Slide preset that leaves is one window from the place of the view, or at the edge of the
// window when that is farther.
const EXITING: PresetRow[] = [
  [FadeOut, 'Opacity', fadeOutWith()],
  [FadeOutRight, 'Opacity+Transform', fadeOutWith(['translateX', 0, 25])],
  [FadeOutLeft, 'Opacity+Transform', fadeOutWith(['translateX', 0, -25])],
  [FadeOutUp, 'Opacity+Transform', fadeOutWith(['translateY', 0, -25])],
  [FadeOutDown, 'Opacity+Transform', fadeOutWith(['translateY', 0, 25])],
  [SlideOutRight, 'PositionX', declare({ originX: { to: WINDOW.width } })],
  [
    SlideOutLeft,
    'PositionX',
    declare({ originX: { to: -WINDOW.width - REST.left } }),
  ],
  [
    SlideOutUp,
    'PositionY',
    declare({ originY: { to: -WINDOW.height - REST.top } }),
  ],
  [SlideOutDown, 'PositionY', declare({ originY: { to: WINDOW.height } })],
  [StretchOutX, 'Transform', transformOf(['scaleX', 1, 0])],
  [StretchOutY, 'Transform', transformOf(['scaleY', 1, 0])],
  [ZoomOut, 'Transform', transformOf(['scale', 1, 0])],
  // The end angle of the preset is the text '0.3'. Each frame has the unit of the start angle.
  [
    ZoomOutRotate,
    'Transform',
    transformOf(['scale', 1, 0], ['rotate', '0rad', '0.3rad']),
  ],
  [
    ZoomOutLeft,
    'Transform',
    transformOf(['translateX', 0, -WINDOW.width], ['scale', 1, 0]),
  ],
  [
    ZoomOutRight,
    'Transform',
    transformOf(['translateX', 0, WINDOW.width], ['scale', 1, 0]),
  ],
  [
    ZoomOutUp,
    'Transform',
    transformOf(['translateY', 0, -WINDOW.height], ['scale', 1, 0]),
  ],
  [
    ZoomOutDown,
    'Transform',
    transformOf(['translateY', 0, WINDOW.height], ['scale', 1, 0]),
  ],
  [
    ZoomOutEasyUp,
    'Transform',
    transformOf(['translateY', 0, -REST.height], ['scale', 1, 0]),
  ],
  [
    ZoomOutEasyDown,
    'Transform',
    transformOf(['translateY', 0, REST.height], ['scale', 1, 0]),
  ],
  [RotateOutDownLeft, 'Opacity+Transform', rotateOutTo('90deg')],
  [RotateOutDownRight, 'Opacity+Transform', rotateOutTo('-90deg')],
  [RotateOutUpLeft, 'Opacity+Transform', rotateOutTo('-90deg')],
  [RotateOutUpRight, 'Opacity+Transform', rotateOutTo('90deg')],
  [
    RollOutLeft,
    'Transform',
    transformOf(
      ['translateX', 0, -WINDOW.width],
      ['rotate', '0deg', '-180deg']
    ),
  ],
  [
    RollOutRight,
    'Transform',
    transformOf(['translateX', 0, WINDOW.width], ['rotate', '0deg', '180deg']),
  ],
  [
    PinwheelOut,
    'Opacity+Transform',
    fadeOutWith(['scale', 1, 0], ['rotate', '0rad', '5rad']),
  ],
  [
    FlipOutXUp,
    'Transform',
    transformOf(
      PERSPECTIVE,
      ['rotateX', '0deg', '90deg'],
      ['translateY', 0, -REST.height]
    ),
  ],
  [
    FlipOutXDown,
    'Transform',
    transformOf(
      PERSPECTIVE,
      ['rotateX', '0deg', '-90deg'],
      ['translateY', 0, REST.height]
    ),
  ],
  [
    FlipOutYLeft,
    'Transform',
    transformOf(
      PERSPECTIVE,
      ['rotateY', '0deg', '-90deg'],
      ['translateX', 0, -REST.width]
    ),
  ],
  [
    FlipOutYRight,
    'Transform',
    transformOf(
      PERSPECTIVE,
      ['rotateY', '0deg', '90deg'],
      ['translateX', 0, REST.width]
    ),
  ],
  [
    FlipOutEasyX,
    'Transform',
    transformOf(PERSPECTIVE, ['rotateX', '0deg', '90deg']),
  ],
  [
    FlipOutEasyY,
    'Transform',
    transformOf(PERSPECTIVE, ['rotateY', '0deg', '90deg']),
  ],
  [LightSpeedOutRight, 'LayoutBuildFailed:UnsupportedValue'],
  [LightSpeedOutLeft, 'LayoutBuildFailed:UnsupportedValue'],
  [
    BounceOut,
    'Transform',
    bounceOf('scale', BOUNCE_OUT, [1, 1.1, 0.9, 1.2, 0]),
  ],
  [
    BounceOutDown,
    'Transform',
    bounceOf('translateY', BOUNCE_OUT, [0, -10, 10, -20, WINDOW.height]),
  ],
  [
    BounceOutUp,
    'Transform',
    bounceOf('translateY', BOUNCE_OUT, [0, 10, -10, 20, -WINDOW.height]),
  ],
  [
    BounceOutLeft,
    'Transform',
    bounceOf('translateX', BOUNCE_OUT, [0, 10, -10, 20, -WINDOW.width]),
  ],
  [
    BounceOutRight,
    'Transform',
    bounceOf('translateX', BOUNCE_OUT, [0, -10, 10, -20, WINDOW.width]),
  ],
];

const GEOMETRY: Key[] = ['originX', 'originY', 'width', 'height'];
const GEOMETRY_ROUTE = 'PositionX+PositionY+Width+Height';

const geometryOf = (leafOf: (key: Key) => Leaf): Leaves =>
  Object.fromEntries(GEOMETRY.map((key) => [key, leafOf(key)]));

const CURVED_TRANSITION_EASINGS: Partial<Record<Key, Leaf['easing']>> = {
  originX: Easing.in(Easing.ease),
  originY: Easing.out(Easing.ease),
  width: Easing.in(Easing.exp),
  height: Easing.out(Easing.exp),
};

const LINEAR: Declare = (timing) => ({ leaves: geometryOf(() => timing) });
const CURVED: Declare = (timing) => ({
  leaves: geometryOf((key) => ({
    ...timing,
    easing: CURVED_TRANSITION_EASINGS[key],
  })),
});

// The opacity goes to 0 and comes back. Each layout key has its new value from the half of the time.
const FADING: Declare = (timing) => ({
  leaves: {
    opacity: {
      ...sequenceOf(timing, [
        [{ to: 0 }, 0.5],
        [{}, 0.5],
      ]),
      initial: 1,
      to: 1,
    },
    ...geometryOf(() => ({ delays: [DURATION / 2], duration: 0 })),
  },
});

/**
 * The keys of `movesFirst` move in the first half, the others in the second
 * half.
 */
const sequencedOf =
  (movesFirst: Key[]): Declare =>
  (timing) => ({
    leaves: geometryOf((key) =>
      sequenceOf(timing, [
        [{ level: movesFirst.includes(key) ? 1 : 0 }, 0.5],
        [{}, 0.5],
      ])
    ),
  });
const SEQUENCED = sequencedOf(['originX', 'width']);
const SEQUENCED_IN_REVERSE = sequencedOf(['originY', 'height']);

const JUMP_HEIGHT = Math.max(
  Math.abs(MOVED.left - REST.left),
  Math.abs(MOVED.top - REST.top)
);
const JUMPING: Declare = (timing) => ({
  leaves: {
    ...geometryOf(() => timing),
    originY: sequenceOf(timing, [
      [
        { to: Math.min(REST.top, MOVED.top) - JUMP_HEIGHT - MOVED.top },
        0.5,
        Easing.out(Easing.exp),
      ],
      [{}, 0.5, Easing.bounce],
    ]),
  },
});

// The time of EntryExitTransition is the sum of the times of its two animations.
const timedEntryExit = () =>
  new EntryExitTransition()
    .entering(new FadeIn().duration(DURATION / 2))
    .exiting(new FadeOut().duration(DURATION / 2)) as Builder;

const LAYOUT: PresetRow[] = [
  [LinearTransition, GEOMETRY_ROUTE, LINEAR],
  [CurvedTransition, GEOMETRY_ROUTE, CURVED],
  [FadingTransition, `Opacity+${GEOMETRY_ROUTE}`, FADING],
  [SequencedTransition, GEOMETRY_ROUTE, SEQUENCED],
  [JumpingTransition, GEOMETRY_ROUTE, JUMPING],
  [
    EntryExitTransition,
    'LayoutBuildFailed:UnsupportedTrackForm',
    undefined,
    timedEntryExit,
  ],
];

const PLACES: Record<Flow, ReferenceCase['places']> = {
  entering: [undefined, REST],
  exiting: [REST, undefined],
  layout: [REST, MOVED],
};

/** The targets of the native tracks, or the events of a start with no command. */
function routeOf(events: TraceEvent[]) {
  const hostEvents = events.filter(
    (event) => isHostEvent(event) && event.event !== 'FrameUpdateMounted'
  );
  const targets = hostEvents
    .filter(({ event }) => event === 'TrackStarted')
    .map(({ target }) => target);
  const isAdmitted = hostEvents.some(({ event }) => event === 'Admitted');
  return isAdmitted ? targets.join('+') : summarize(hostEvents);
}

const TWIN_ROUTE = `LayoutBuildFailed:${NATIVE_TIMING}`;
const isNativeRoute = (route: string) => !route.startsWith('Layout');
const BUILD_FAILED = 'LayoutBuildFailed:';
/** The failure of a route that is one build failure. */
const refusalOf = (route: string) =>
  route.startsWith(BUILD_FAILED) && !route.includes(' > ')
    ? route.slice(BUILD_FAILED.length)
    : undefined;

const REFUSED_ROUTE = 'LayoutBuildFailed:UnsupportedTarget';

/**
 * The presets with a perspective and a rotation about X or Y, from their
 * source.
 */
const THREE_D_PRESETS: Preset[] = [
  FlipInXUp,
  FlipInXDown,
  FlipInYLeft,
  FlipInYRight,
  FlipInEasyX,
  FlipInEasyY,
  FlipOutXUp,
  FlipOutXDown,
  FlipOutYLeft,
  FlipOutYRight,
  FlipOutEasyX,
  FlipOutEasyY,
];

/** What the animation of a preset needs of the platform for its native route. */
type PlatformNeeds = {
  changesSize?: boolean;
  has3DOperations?: boolean;
  /** No value: a target of the route is a geometry target. */
  movesGeometry?: boolean;
};

/**
 * The route of a preset on the platform of the build. `makeTrack`
 * (NativeLayoutTracks.cpp) asks the platform whether it plays a track before
 * the track form check and the endpoint check of the track: a target that the
 * platform does not play gives `UnsupportedTarget`, and the whole animation
 * stays on the frame driver.
 */
function platformRouteOf(
  route: string,
  {
    changesSize = false,
    has3DOperations = false,
    movesGeometry = movesGeometryOf(
      route.split('+').map((target) => ({ target, moves: true }))
    ),
  }: PlatformNeeds = {}
) {
  const isRefused =
    (changesSize && !PLAYS_SIZE_CHANGE) ||
    (has3DOperations && !PLAYS_3D_OPERATIONS) ||
    (movesGeometry && !PLAYS_MOVING_GEOMETRY);
  return isRefused ? REFUSED_ROUTE : route;
}

/**
 * A layout change of the preset rows goes from `REST` to `MOVED`: its size
 * changes.
 */
const presetRouteOf = (PresetClass: Preset, flow: Flow, route: string) =>
  platformRouteOf(route, {
    changesSize: flow === 'layout' && isNativeRoute(route),
    has3DOperations: THREE_D_PRESETS.includes(PresetClass),
  });
const routeNameOf = (route: string) =>
  isNativeRoute(route)
    ? `plays natively (${route})`
    : `stays frame-driven (${route})`;

const hasLeft = (tag: number) =>
  sample(tag, 'Opacity').then(() => false, isNoView);

/** The removal of the native box of a played exit ends its command. */
async function expectLeft({ events }: Played) {
  const { tag } = events[0];
  const isRemoved = (taken: TraceEvent[]) =>
    taken.some((event) => event.tag === tag && event.event === 'Ended');
  if (!isRemoved(events)) {
    await takeTraceUntil(isRemoved);
  }
  expect(await hasLeft(tag)).toBe(true);
}

type TimedPreset = {
  name: string;
  flow: Flow;
  route: string;
  declare: Declare;
  makeAnimation: () => Builder;
  delayMs?: number;
};

const playedTags: Record<string, number> = {};

/** The box of a played case, with a record of the tag of its view. */
function TaggedBox(props: SizeBoxProps) {
  const { refName = BOX_REF } = props;
  useEffect(() => {
    playedTags[refName] = getTestComponent(refName).getTag();
  }, [refName]);
  return <SizeBox {...props} />;
}

/** Each box of a played case has no style transform. */
const PLAYED_BOX: ReferenceCase['box'] = {
  Box: TaggedBox,
  style: { transform: undefined },
};

async function playTagged(referenceCase: ReferenceCase) {
  delete playedTags[BOX_REF];
  delete playedTags[FRAME_BOX_REF];
  return play(referenceCase);
}

const caseOf = ({
  flow,
  route,
  declare: declareFor,
  makeAnimation,
  delayMs,
}: TimedPreset): ReferenceCase => ({
  flow,
  ...declareFor({
    duration: DURATION,
    easing: 'default',
    delays: delayMs === undefined ? undefined : [delayMs],
  }),
  isFrameDriven: !isNativeRoute(route),
  refusedWith: refusalOf(route),
  places: PLACES[flow],
  totalMs: (delayMs ?? 0) + DURATION,
  builder: makeAnimation as unknown as () => CallbackBuilder,
  box: PLAYED_BOX,
});

/** Statements A and B of a preset, its route, its end, and its callbacks. */
async function expectOnTimeline(preset: TimedPreset) {
  const referenceCase = caseOf(preset);
  const played = await playTagged(referenceCase);
  expectReference(preset.name, referenceCase, played);
  expect(routeOf(played.events)).toBe(preset.route);
  if (preset.flow === 'exiting') {
    await expectLeft(played);
  }
  await expectPlayedEndAsTwin(preset.flow, played);
  await render(null);
}

const SCALARS = ['Opacity', 'PositionX', 'PositionY', 'Width', 'Height'];
const TARGETS = [...SCALARS, 'Transform'];
type BoxSample = Record<string, TargetSample>;

function PresetBox({
  refName,
  frame,
  animations,
}: {
  refName: string;
  frame: BoxFrame;
  animations: BoxAnimations;
}) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      {...animations}
      style={[
        localStyles.box,
        {
          marginLeft: frame.left,
          marginTop: frame.top,
          width: frame.width,
          height: frame.height,
        },
      ]}
    />
  );
}

type Scene = { isMounted: boolean; boxFrame: BoxFrame };
type Cell = { refName: string; animations: BoxAnimations };

function PresetCells({
  cells,
  isMounted,
  boxFrame,
}: Scene & { cells: Cell[] }) {
  return (
    <View>
      {cells.map(({ refName, animations }) => (
        <View key={refName} collapsable={false} style={localStyles.cell}>
          {isMounted && (
            <PresetBox
              refName={refName}
              frame={boxFrame}
              animations={animations}
            />
          )}
        </View>
      ))}
    </View>
  );
}

/** No sample when the view left. */
async function sampleBox(tag: number): Promise<BoxSample | undefined> {
  try {
    const samples = await Promise.all(
      TARGETS.map((target) => sample(tag, target))
    );
    return Object.fromEntries(
      TARGETS.map((target, index) => [target, samples[index]])
    );
  } catch {
    return undefined;
  }
}

const TRANSLATION_CELLS = [12, 13, 14];

/** A translation of 100 pt counts as much as 1 in each other cell. */
const matrixDistance = (first: number[], second: number[]) =>
  Math.max(
    ...first.map(
      (cell, index) =>
        Math.abs(cell - second[index]) /
        (TRANSLATION_CELLS.includes(index) ? 100 : 1)
    )
  );

/** The origin of the box. A size track moves the center and not the origin. */
function scalarsOf(box: BoxSample, layer: 'model' | 'presentation') {
  const valueOf = (target: string) => box[target][layer][0];
  return {
    Opacity: valueOf('Opacity'),
    PositionX: valueOf('PositionX') - valueOf('Width') / 2,
    PositionY: valueOf('PositionY') - valueOf('Height') / 2,
    Width: valueOf('Width'),
    Height: valueOf('Height'),
  } as Record<string, number>;
}

const restToleranceOf = (target: string) =>
  target === 'Opacity' ? AT_REST.opacity : AT_REST.points;

/** What the two boxes show for one target, in the unit of the target. */
type Comparison = {
  target: string;
  native: number;
  twin: number;
  difference: number;
  isInBound: boolean;
};

/**
 * No target of a box that stays frame-driven has a native track: the two boxes
 * are equal.
 */
function compare(native: BoxSample, frame: BoxSample): Comparison[] {
  const shown = scalarsOf(native, 'presentation');
  const twin = scalarsOf(frame, 'model');
  const comparisons = SCALARS.map((target) => {
    const difference = Math.abs(shown[target] - twin[target]);
    return {
      target,
      native: shown[target],
      twin: twin[target],
      difference,
      isInBound: difference < restToleranceOf(target),
    };
  });
  const difference = matrixDistance(
    native.Transform.presentation,
    frame.Transform.model
  );
  return [
    ...comparisons,
    {
      target: 'Transform',
      native: 0,
      twin: 0,
      difference,
      isInBound: difference < AT_REST.cells,
    },
  ];
}

type Row = FrameDriverRow<{ native: BoxSample; frame: BoxSample }>;

/** The first and the last sample time of a box, from `originMs`. */
function sampleTimesOf(box: BoxSample, originMs: number) {
  const times = TARGETS.map((target) => box[target].monotonicTimeMs);
  return [Math.min(...times), Math.max(...times)]
    .map((time) => (time - originMs).toFixed(1))
    .join('..');
}

/** Each value of a row and its times, in ms from the start of the native box. */
function describeRow(
  { native, frame, lateMs, lateFramesMs }: Row,
  comparisons: Comparison[],
  starts: { native: number; frame: number }
) {
  const model = scalarsOf(native, 'model');
  const values = comparisons.map(
    ({ target, native: shown, twin, difference, isInBound }) =>
      [
        `${target} native ${shown.toFixed(3)}`,
        ...(target in model ? [`model ${model[target].toFixed(3)}`] : []),
        `twin ${twin.toFixed(3)} difference ${difference.toFixed(4)}`,
        ...(isInBound ? [] : ['OUT']),
      ].join(' ')
  );
  return [
    `twin start ${(starts.frame - starts.native).toFixed(1)}`,
    `frame of the twin late ${lateMs.toFixed(1)}, rows taken again ${lateFramesMs.map((late) => late.toFixed(1)).join(' ') || 'none'}`,
    `native samples ${sampleTimesOf(native, starts.native)}`,
    `twin samples ${sampleTimesOf(frame, starts.native)}`,
    ...values,
  ].join(' | ');
}

/** True when each target of the box shows the value of its model. */
/**
 * The targets whose values of `first` and `second` differ by the rest tolerance
 * or more, with the two values.
 */
function restFaultsOf(
  [firstName, first]: [string, Record<string, number>],
  [secondName, second]: [string, Record<string, number>],
  [firstCells, secondCells]: [number[], number[]]
) {
  return [
    ...SCALARS.filter(
      (target) =>
        !(Math.abs(first[target] - second[target]) < restToleranceOf(target))
    ).map(
      (target) =>
        `${target}: ${firstName} ${first[target]}, ${secondName} ${second[target]}`
    ),
    ...(matrixDistance(firstCells, secondCells) < AT_REST.cells
      ? []
      : [
          `Transform: ${firstName} ${firstCells.join()}, ${secondName} ${secondCells.join()}`,
        ]),
  ];
}

/** The shown values of the rows of a box differ from row to row: the box moves. */
const hasDistinctRows = (rows: BoxSample[]) =>
  rows.length >= 2 &&
  rows.every((row, index) => index === 0 || !isSameShown(row, rows[index - 1]));

function isSameShown(first: BoxSample, second: BoxSample) {
  const firstShown = scalarsOf(first, 'presentation');
  const secondShown = scalarsOf(second, 'presentation');
  return (
    SCALARS.every(
      (target) =>
        Math.abs(firstShown[target] - secondShown[target]) <
        restToleranceOf(target)
    ) &&
    matrixDistance(
      first.Transform.presentation,
      second.Transform.presentation
    ) < AT_REST.cells
  );
}

const SCENES: Record<Flow, { before: Scene; after: Scene }> = {
  entering: {
    before: { isMounted: false, boxFrame: REST },
    after: { isMounted: true, boxFrame: REST },
  },
  exiting: {
    before: { isMounted: true, boxFrame: REST },
    after: { isMounted: false, boxFrame: REST },
  },
  layout: {
    before: { isMounted: true, boxFrame: REST },
    after: { isMounted: true, boxFrame: MOVED },
  },
};

const PLAIN_BOX_REF = 'NativeLayoutPresetPlainBox';
type Play = {
  flow: Flow;
  /** The animation of the native box and of its twin, before its callback. */
  makeAnimation: () => Builder;
  /** The animation of one more box, which has no callback. */
  plain?: BoxAnimations[Flow];
  /** The time of the animation for the rows. No value: no rows. */
  durationMs?: number;
  /** The part of the time of the animation at which each row is. */
  fractions?: number[];
  /** The frame of the box after a layout change. */
  movedTo?: BoxFrame;
  /** Each call of the function of the native box and of its twin has a record. */
  countsBuilderCalls?: boolean;
};

const builderOf = (animation: Builder) =>
  animation as unknown as Parameters<typeof countedOf>[1];

async function playScene({
  flow,
  makeAnimation,
  plain,
  durationMs,
  fractions = FRACTIONS,
  movedTo,
  countsBuilderCalls = false,
}: Play) {
  const animationOf = (name: string) => {
    const animation = makeAnimation().withCallback(callbackOf(name)) as Builder;
    return countsBuilderCalls
      ? countedOf(name, builderOf(animation))
      : animation;
  };
  const cells: Cell[] = [
    { refName: BOX_REF, animations: { [flow]: animationOf('native') } },
    {
      refName: FRAME_BOX_REF,
      animations: { [flow]: frameDrivenOf(animationOf('frame')) },
    },
    ...(plain
      ? [{ refName: PLAIN_BOX_REF, animations: { [flow]: plain } }]
      : []),
  ];
  const { before } = SCENES[flow];
  const after = {
    ...SCENES[flow].after,
    ...(movedTo && { boxFrame: movedTo }),
  };
  const tagsOf = () =>
    cells.map(({ refName }) => getTestComponent(refName).getTag());

  await render(<PresetCells cells={cells} {...before} />);
  await wait(200);
  const tagsBefore = flow === 'entering' ? undefined : tagsOf();
  await takeTrace();
  callbacks.length = 0;
  namedBuilderCalls.length = 0;
  const startMs = performance.now();
  await render(<PresetCells cells={cells} {...after} />);
  const [nativeTag, frameTag, plainTag] = tagsBefore ?? tagsOf();

  const rows: Row[] = [];
  const rowTimes =
    durationMs === undefined
      ? []
      : fractions.map((fraction) => fraction * durationMs);
  for (const rowTime of rowTimes) {
    await wait(Math.max(0, startMs + rowTime - performance.now()));
    rows.push(
      await takeAtFrameDriverFrame(async () => {
        const [native, frame] = await Promise.all([
          sampleBox(nativeTag),
          sampleBox(frameTag),
        ]);
        return { native: native!, frame: frame! };
      })
    );
  }
  await waitForCallbacks(2);
  await wait(300);
  const [native, frame, plainBox] = await Promise.all([
    sampleBox(nativeTag),
    sampleBox(frameTag),
    plainTag === undefined ? Promise.resolve(undefined) : sampleBox(plainTag),
  ]);
  const events = await takeTrace();
  const routeOfTag = (tag: number) =>
    routeOf(events.filter((event) => event.tag === tag));
  const startOf = (tag: number) =>
    events.find((event) => event.tag === tag)?.monotonicTimeMs ?? NaN;
  return {
    rows,
    end: { native, frame, plain: plainBox },
    route: routeOfTag(nativeTag),
    twinRoute: routeOfTag(frameTag),
    plainRoute: plainTag === undefined ? undefined : routeOfTag(plainTag),
    starts: { native: startOf(nativeTag), frame: startOf(frameTag) },
    builderCalls: [...namedBuilderCalls].sort().join(),
  };
}

/** The end of a box that played natively or not, against its frame-driven twin. */
function expectEndAsTwin(
  flow: Flow,
  box: BoxSample | undefined,
  twin: BoxSample | undefined
) {
  if (flow === 'exiting') {
    expect(box).toBeUndefined();
    expect(twin).toBeUndefined();
    return;
  }
  expect(box!.Opacity.playbacks.length).toBe(0);
  expect(
    restFaultsOf(
      ['shown', scalarsOf(box!, 'presentation')],
      ['model', scalarsOf(box!, 'model')],
      [box!.Transform.presentation, box!.Transform.model]
    ).join('; ')
  ).toBe('');
  expect(
    restFaultsOf(
      ['model', scalarsOf(box!, 'model')],
      ['twin model', scalarsOf(twin!, 'model')],
      [box!.Transform.model, twin!.Transform.model]
    ).join('; ')
  ).toBe('');
}

/** The end of the two boxes of a played case, each target against the twin. */
async function expectPlayedEndAsTwin(flow: Flow, { events }: Played) {
  const [nativeTag, frameTag] = [BOX_REF, FRAME_BOX_REF].map(
    (refName) => playedTags[refName]
  );
  expect(nativeTag).toBe(events[0].tag);
  expect(frameTag > 0).toBe(true);
  await wait(300);
  const [native, frame] = await Promise.all([
    sampleBox(nativeTag),
    sampleBox(frameTag),
  ]);
  expectEndAsTwin(flow, native, frame);
}

const FRACTIONS = [0.25, 0.5, 0.75];
// Not symmetric about one half: a curve that comes back to a value does not give one value at two rows.
const FALLBACK_FRACTIONS = [0.3, 0.55, 0.8];

/**
 * The route of a preset that stays frame-driven, its rows against its
 * frame-driven twin, its end, and its callbacks.
 */
async function expectAsTwin({
  name,
  flow,
  route,
  makeAnimation,
}: Omit<TimedPreset, 'declare'>) {
  const fractions = isNativeRoute(route) ? FRACTIONS : FALLBACK_FRACTIONS;
  const played = await playScene({
    flow,
    makeAnimation,
    durationMs: DURATION,
    fractions,
  });

  expect(played.route).toBe(route);
  expect(played.twinRoute).toBe(TWIN_ROUTE);
  const comparisons = played.rows.map(({ native, frame }) => {
    expect(native.Opacity.playbacks.length).toBe(0);
    return compare(native, frame);
  });
  if (!isNativeRoute(route)) {
    expect(hasDistinctRows(played.rows.map(({ native }) => native))).toBe(true);
  }
  console.log(
    [
      'PRESET',
      flow,
      name,
      played.route,
      `frame of the twin late ${played.rows.map(({ lateMs }) => lateMs.toFixed(1)).join(' ')}`,
    ].join(' | ')
  );
  const isInBound = comparisons.flat().every((row) => row.isInBound);
  played.rows.forEach((row, index) => {
    if (!isInBound || row.lateFramesMs.length > 0) {
      console.log(
        `PRESET-ROW | ${name} | ${fractions[index]} | ${describeRow(row, comparisons[index], played.starts)}`
      );
    }
  });
  expect(isInBound).toBe(true);

  expectEndAsTwin(flow, played.end.native, played.end.frame);
  expect([...callbacks].sort().join()).toBe('frame:true,native:true');
  await render(null);
}

const FLOWS: [Flow, PresetRow[]][] = [
  ['entering', ENTERING],
  ['exiting', EXITING],
  ['layout', LAYOUT],
];

const ON_TIMELINE =
  'is on its declared timeline and ends as its frame-driven twin';

/** Presets with sequences and one more method call. */
const SEQUENCE_VARIANTS: TimedPreset[] = [
  {
    name: 'BounceIn with a delay',
    flow: 'entering',
    route: 'Transform',
    declare: ENTERING.find(([preset]) => preset === BounceIn)![2]!,
    makeAnimation: () => new BounceIn().duration(DURATION).delay(DELAY),
    delayMs: DELAY,
  },
  {
    name: 'BounceOut with a delay',
    flow: 'exiting',
    route: 'Transform',
    declare: EXITING.find(([preset]) => preset === BounceOut)![2]!,
    makeAnimation: () => new BounceOut().duration(DURATION).delay(DELAY),
    delayMs: DELAY,
  },
  {
    name: 'SequencedTransition with a delay',
    flow: 'layout',
    route: GEOMETRY_ROUTE,
    declare: SEQUENCED,
    makeAnimation: () =>
      new SequencedTransition().duration(DURATION).delay(DELAY),
    delayMs: DELAY,
  },
  {
    name: 'SequencedTransition in reverse',
    flow: 'layout',
    route: GEOMETRY_ROUTE,
    declare: SEQUENCED_IN_REVERSE,
    makeAnimation: () => new SequencedTransition().duration(DURATION).reverse(),
  },
];

/**
 * The exiting presets with a rotation from 0. With a delay the frame driver has
 * edge antialiasing in only a part of the time of the track, so the platform
 * refuses the `Transform` track.
 */
const EXITS_WITH_A_ROTATION_FROM_0: Preset[] = [
  PinwheelOut,
  RollOutLeft,
  RollOutRight,
  RotateOutDownLeft,
  RotateOutDownRight,
  RotateOutUpLeft,
  RotateOutUpRight,
  ZoomOutRotate,
];

describe('native layout presets with their default easing', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [flow, presets] of FLOWS) {
    for (const [PresetClass, route, declareFor, makeTimed] of presets) {
      const preset = {
        name: PresetClass.name,
        flow,
        route: presetRouteOf(PresetClass, flow, route),
        makeAnimation:
          makeTimed ?? (() => new PresetClass().duration(DURATION)),
      };
      if (declareFor) {
        test(`${preset.name} ${routeNameOf(route)} and ${ON_TIMELINE}`, () =>
          expectOnTimeline({ ...preset, declare: declareFor }));
      } else {
        test(`${preset.name} ${routeNameOf(route)} and agrees with its frame-driven twin`, () =>
          expectAsTwin(preset));
      }
    }
  }

  for (const appleVariant of SEQUENCE_VARIANTS) {
    const variant = {
      ...appleVariant,
      route: platformRouteOf(appleVariant.route, {
        changesSize: appleVariant.flow === 'layout',
      }),
    };
    test(`${variant.name} ${routeNameOf(variant.route)} and ${ON_TIMELINE}`, () =>
      expectOnTimeline(variant));
  }

  if (HAS_EDGE_ANTIALIASING) {
    for (const PresetClass of EXITS_WITH_A_ROTATION_FROM_0) {
      const name = `${PresetClass.name} with a delay`;
      test(`${name} ${routeNameOf(REFUSED_ROUTE)} and agrees with its frame-driven twin`, () =>
        expectAsTwin({
          name,
          flow: 'exiting',
          route: REFUSED_ROUTE,
          makeAnimation: () =>
            new PresetClass().duration(DURATION).delay(DELAY),
        }));
    }
  }

  test('a busy main thread makes a gap in the frames of the frame-driven twin, and each box stays on its declared timeline', async () => {
    const BUSY_MS = 150;
    const caseName = 'FadeIn and a busy main thread';
    const referenceCase: ReferenceCase = {
      ...caseOf({
        name: caseName,
        flow: 'entering',
        route: 'Opacity',
        declare: fadeInWith(),
        makeAnimation: () => new FadeIn().duration(DURATION),
      }),
      checkpoint: {
        atMs: DURATION / 2,
        run: () => scheduleOnUI(blockUIThread, BUSY_MS),
      },
    };
    const played = await play(referenceCase);
    expectReference(caseName, referenceCase, played);

    const frames = played.frameChecks
      .filter(({ record }) => record.box === 'frame')
      .flatMap(({ record }) => record.frames);
    const gaps = frames
      .slice(1)
      .map(({ timeMs }, index) => timeMs - frames[index].timeMs);
    console.log(
      `PRESET-BUSY | frames of the twin ${frames.length} | largest gap ${Math.max(...gaps).toFixed(1)} ms | gaps over one display frame and a half ${
        gaps
          .filter((gap) => gap > 1.5 * FRAME_MS)
          .map((gap) => gap.toFixed(1))
          .join(' ') || 'none'
      }`
    );
    expect(Math.max(...gaps) > BUSY_MS - FRAME_MS).toBe(true);
    await render(null);
  });
});

describe('native layout presets with no method call', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  // The native box and its twin have a callback and no other method call. The third box has the preset itself.
  for (const [flow, presets] of FLOWS) {
    for (const [PresetClass, appleRoute] of presets) {
      const route = presetRouteOf(PresetClass, flow, appleRoute);
      test(`${PresetClass.name} with no method call ${routeNameOf(route)} and ends as its frame-driven twin`, async () => {
        const played = await playScene({
          flow,
          makeAnimation: () => new PresetClass(),
          plain: PresetClass as unknown as BoxAnimations[Flow],
        });

        console.log(
          `PRESET-NO-CALL | ${flow} | ${PresetClass.name} | ${played.plainRoute} | ${played.route}`
        );
        expect(played.plainRoute).toBe(route);
        expect(played.route).toBe(route);
        expect(played.twinRoute).toBe(TWIN_ROUTE);
        expectEndAsTwin(flow, played.end.plain, played.end.frame);
        expectEndAsTwin(flow, played.end.native, played.end.frame);
        expect([...callbacks].sort().join()).toBe('frame:true,native:true');
        await render(null);
      });
    }
  }
});

describe('native layout transitions and a width change near 250 pt', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  // The fit of an easing has a smaller tolerance for a change over 250 pt. `Easing.exp` starts at 2^-10 and has no
  // fit then. CurvedTransition has it on the width and on the height.
  const NATIVE_ROUTE = 'PositionX+PositionY+Width+Height';
  const transitions: [string, () => Builder, number, string][] = [
    ['LinearTransition', () => new LinearTransition(), 280, NATIVE_ROUTE],
    [
      'LinearTransition with Easing.exp',
      () => new LinearTransition().easing(Easing.exp),
      240,
      NATIVE_ROUTE,
    ],
    [
      'LinearTransition with Easing.exp',
      () => new LinearTransition().easing(Easing.exp),
      280,
      TWIN_ROUTE,
    ],
    ['CurvedTransition', () => new CurvedTransition(), 240, NATIVE_ROUTE],
    ['CurvedTransition', () => new CurvedTransition(), 280, TWIN_ROUTE],
  ];
  for (const [
    transitionName,
    makeAnimation,
    change,
    appleRoute,
  ] of transitions) {
    const route = platformRouteOf(appleRoute, {
      changesSize: isNativeRoute(appleRoute),
    });
    test(`${transitionName} over a width change of ${change} pt ${routeNameOf(route)} and ends as its frame-driven twin`, async () => {
      const played = await playScene({
        flow: 'layout',
        makeAnimation,
        movedTo: widerBy(change),
        countsBuilderCalls: true,
      });

      console.log(
        `PRESET-WIDE | ${transitionName} | ${change} pt | ${played.route} | builder calls ${played.builderCalls}`
      );
      expect(played.route).toBe(route);
      expect(played.twinRoute).toBe(TWIN_ROUTE);
      expect(played.builderCalls).toBe('frame,native');
      expectEndAsTwin('layout', played.end.native, played.end.frame);
      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
      await render(null);
    });
  }
});

describe('native layout keyframes', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  type Definitions = ConstructorParameters<typeof Keyframe>[0];
  const SCALE_AND_ROTATE = [{ scale: 0.5 }, { rotate: '0deg' }];
  const AT_REST_TRANSFORM = [{ scale: 1 }, { rotate: '0deg' }];
  const fade = () => ({ 0: { opacity: 0 }, 100: { opacity: 1 } });
  const morePoints = () => ({
    0: { opacity: 0 },
    30: { opacity: 1 },
    60: { opacity: 0.4 },
    100: { opacity: 1 },
  });
  const eased = () => ({
    0: { opacity: 0 },
    50: { opacity: 0.8, easing: Easing.quad },
    100: { opacity: 1, easing: Easing.out(Easing.exp) },
  });
  const transformAt50 = (operations: object[]) => () => ({
    0: { transform: SCALE_AND_ROTATE },
    50: { transform: operations },
    100: { transform: AT_REST_TRANSFORM },
  });
  const fadeOut = () => ({
    0: { opacity: 1 },
    40: { opacity: 0.3 },
    100: { opacity: 0 },
  });
  /** Each point but the first gives one segment to the track of the opacity. */
  const segmentsOf = (count: number) => () =>
    Object.fromEntries(
      Array.from({ length: count + 1 }, (_, point) => [
        point === count ? 100 : point,
        { opacity: point === count ? 1 : 0.25 + 0.5 * (point % 2) },
      ])
    );
  // A keyframe animation changes its definitions, so each animation has its own.
  const keyframes: [string, Flow, () => object, number | undefined, string][] =
    [
      ['one point for each key', 'entering', fade, undefined, 'Opacity'],
      ['one point and a delay', 'entering', fade, 200, 'Opacity'],
      ['more points', 'entering', morePoints, undefined, 'Opacity'],
      ['more points and a delay', 'entering', morePoints, 200, 'Opacity'],
      ['an easing on each point', 'entering', eased, undefined, 'Opacity'],
      [
        'operations with the same points',
        'entering',
        transformAt50([{ scale: 1.2 }, { rotate: '45deg' }]),
        undefined,
        'Transform',
      ],
      [
        'operations with other points',
        'entering',
        transformAt50([{ scale: 1.2 }]),
        undefined,
        'Transform',
      ],
      ['more points in an exit', 'exiting', fadeOut, undefined, 'Opacity'],
      [
        'the 64 segments of the segment budget',
        'entering',
        segmentsOf(64),
        undefined,
        'Opacity',
      ],
      [
        'one segment more than the segment budget',
        'entering',
        segmentsOf(65),
        undefined,
        'LayoutBuildFailed:ResourceLimit',
      ],
    ];
  for (const [
    keyframeName,
    flow,
    definitionsOf,
    delayMs,
    appleRoute,
  ] of keyframes) {
    const route = platformRouteOf(appleRoute);
    test(`a keyframe animation with ${keyframeName} ${routeNameOf(route)} and ends as its frame-driven twin`, async () => {
      const played = await playScene({
        flow,
        makeAnimation: () => {
          const animation = new Keyframe(
            definitionsOf() as Definitions
          ).duration(600);
          return (delayMs === undefined
            ? animation
            : animation.delay(delayMs)) as unknown as Builder;
        },
        countsBuilderCalls: true,
      });

      console.log(
        `KEYFRAME | ${keyframeName} | ${played.route} | builder calls ${played.builderCalls}`
      );
      expect(played.route).toBe(route);
      expect(played.twinRoute).toBe(TWIN_ROUTE);
      expect(played.builderCalls).toBe('frame,native');
      expectEndAsTwin(flow, played.end.native, played.end.frame);
      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
      await render(null);
    });
  }
});

describe('native layout animations with a plain number', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  type Callback = (finished: boolean) => void;
  type Values = Record<string, number>;
  type MakeAnimation = (callback?: Callback) => (values: Values) => object;

  const BUILDER_CALL = 'plain number';

  /** A builder of the animation function of `make`, with a record of each call. */
  function builderOfFunction(make: MakeAnimation) {
    let callback: Callback | undefined;
    const builder = {
      withCallback: (next: Callback) => {
        callback = next;
        return builder;
      },
      build: () =>
        countedOf(
          BUILDER_CALL,
          make(callback) as unknown as Parameters<typeof countedOf>[1]
        ),
    };
    return builder as unknown as CallbackBuilder;
  }

  const INITIAL_OFFSET = -60;

  /**
   * The opacity has an animation. The X is a plain number at `offset` from its
   * place.
   */
  const enteringOf =
    (offset: number): MakeAnimation =>
    (callback) => {
      return (values: Values) => {
        'worklet';
        return {
          initialValues: {
            opacity: 0,
            originX: values.targetOriginX + INITIAL_OFFSET,
          },
          animations: {
            opacity: withTiming(1, { duration: DURATION }),
            originX: values.targetOriginX + offset,
          },
          callback,
        };
      };
    };
  const exitingOf =
    (offset: number): MakeAnimation =>
    (callback) => {
      return (values: Values) => {
        'worklet';
        return {
          initialValues: { opacity: 1, originX: values.currentOriginX },
          animations: {
            opacity: withTiming(0, { duration: DURATION }),
            originX: values.currentOriginX + offset,
          },
          callback,
        };
      };
    };
  const FIRST_FRAMES_AND_MIDDLE = [0.05, 0.5];
  const plainNumbers: [
    string,
    EntryExit,
    (offset: number) => MakeAnimation,
    number,
    string,
  ][] = [
    [
      'an entering animation with a plain number that is the mounted value',
      'entering',
      enteringOf,
      0,
      'Opacity+PositionX',
    ],
    [
      'an entering animation with a plain number that is not the mounted value',
      'entering',
      enteringOf,
      30,
      'LayoutBuildFailed:EndpointMismatch',
    ],
    [
      'an exiting animation with a plain number',
      'exiting',
      exitingOf,
      40,
      'LayoutBuildFailed:UnsupportedTrackForm',
    ],
  ];
  // Each Apple route of a plain number comes after the question to the platform in `makeTrack`.
  for (const [caseName, flow, makeOf, offset, appleRoute] of plainNumbers) {
    const route = platformRouteOf(appleRoute, { movesGeometry: true });
    test(`${caseName} ${routeNameOf(route)}, has its opacity on its declared timeline, shows the plain number in its first frames and at its middle, and ends as its frame-driven twin`, async () => {
      const isNative = isNativeRoute(route);
      const [initial, to] = flow === 'entering' ? [0, 1] : [1, 0];
      const referenceCase: ReferenceCase = {
        flow,
        leaves: {
          opacity: { duration: DURATION, easing: 'default', initial, to },
          // The native route has a track with no duration for the plain number.
          ...(isNative && {
            originX: { initial: INITIAL_OFFSET, duration: 0 },
          }),
        },
        alsoSampled: ['PositionX'],
        isFrameDriven: !isNative,
        places: PLACES[flow],
        totalMs: DURATION,
        builder: () => builderOfFunction(makeOf(offset)),
        box: PLAYED_BOX,
      };
      namedBuilderCalls.length = 0;
      const played = await playTagged(referenceCase);
      expectReference(caseName, referenceCase, played);
      expect(routeOf(played.events)).toBe(route);
      expect(namedBuilderCalls.join()).toBe(`${BUILDER_CALL},${BUILDER_CALL}`);

      const plainX = centerOf(REST.left + offset);
      const twinStart = played.frameChecks.find(
        ({ record }) => record.box === 'frame'
      )?.record.start;
      const startMs = (twinStart?.timeMs ?? NaN) + middleOf(played.clockOffset);
      for (const fraction of FIRST_FRAMES_AND_MIDDLE) {
        const taken = played.rows.find(
          ({ row }) =>
            row.native.PositionX.monotonicTimeMs - startMs >=
            fraction * DURATION
        );
        const shown = [
          taken?.row.native.PositionX.presentation[0] ?? NaN,
          taken?.row.frame.PositionX.model[0] ?? NaN,
        ];
        console.log(
          `PLAIN-NUMBER | ${caseName} | ${route} | ${fraction} | ${((taken?.row.native.PositionX.monotonicTimeMs ?? NaN) - startMs).toFixed(1)} ms after the start of the twin | plain number ${plainX} | native ${shown[0]} | model of the twin ${shown[1]}`
        );
        for (const value of shown) {
          expect(Math.abs(value - plainX) < AT_REST.points).toBe(true);
        }
      }
      if (played.end) {
        const { native, frame } = played.end;
        expect(native.PositionX.playbacks.length).toBe(0);
        expect(
          Math.abs(
            native.PositionX.presentation[0] - frame.PositionX.model[0]
          ) < AT_REST.points
        ).toBe(true);
      }
      await expectPlayedEndAsTwin(flow, played);
      await render(null);
    });
  }
});

const localStyles = StyleSheet.create({
  cell: {
    height: CELL_HEIGHT,
  },
  box: {
    backgroundColor: 'teal',
  },
});
