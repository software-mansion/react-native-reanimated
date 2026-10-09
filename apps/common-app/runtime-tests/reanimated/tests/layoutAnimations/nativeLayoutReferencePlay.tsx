import React from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import {
  getTestComponent,
  render,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  AnimationSource,
  Band,
  Capture,
  DeclaredKey,
  FrameCheck,
  FrameRecord,
  Leaf,
  Leaves,
  Operation,
  PlayedTrack,
  ScalarKey,
  ScalarTrack,
  TakenRow,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbackOf,
  capturesOf,
  declaredDurationOf,
  declaredTimelineOf,
  endTransformOf,
  entryExitOf,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  frameRecordedOf,
  isOfCommand,
  isSameLeaf,
  isScalarTrack,
  layoutOf,
  middleOf,
  narrowClockOffset,
  OPACITY_TOLERANCE,
  PAIR_LEFT,
  PAIR_TOP,
  playedTracksOf,
  POSITION_TOLERANCE,
  readFrameRecords,
  resetCallbacks,
  resetFrameRecords,
  sample,
  START_LEFT,
  styles,
  summarize,
  takeRows,
  takeTrace,
  waitForCallbacks,
} from './nativeLayoutTestKit';

export type BoxName = 'native' | 'frame';
type Flow = 'layout' | 'entering' | 'exiting';
type Animations = Pick<React.ComponentProps<typeof Animated.View>, Flow>;
type Place = {
  left: number;
  top: number;
  opacity?: number;
  width?: number;
  height?: number;
  borderRadius?: number;
};

/** What the animation of a commit declares. */
type Declaration = {
  leaves: Leaves;
  operations?: Operation[];
  /**
   * The native route has no form of the animation: the frame driver plays the
   * two boxes.
   */
  isFrameDriven?: boolean;
};

export type ReferenceCase = Declaration & {
  flow: Flow;
  /**
   * The place of the boxes before the first commit, then after each commit. The
   * boxes are not mounted where there is no place.
   */
  places: (Place | undefined)[];
  /**
   * The time of each commit after the first, from the first. It comes while the
   * animations of the commit before it play.
   */
  commitTimesMs?: number[];
  /** The time of the animations after the last commit. */
  totalMs: number;
  /**
   * The animation of the native box before its callback, when `layoutOf` does
   * not make the animations. The twin has it with no native description.
   */
  builder?: () => CallbackBuilder;
  /** The animation of each commit after the first, when it is another one. */
  replacement?: Declaration;
};

// The type of a Keyframe does not show its `build`.
type CallbackBuilder = {
  withCallback: (callback: (finished: boolean) => void) => AnimationSource;
};

const START: Place = { left: START_LEFT, top: 0 };
const END: Place = { left: PAIR_LEFT, top: PAIR_TOP };
const OVERSHOOT = Easing.out(Easing.back(1.7));
const SHEAR = [1, 0, 0, 0, 0.2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const KEYFRAME_POINTS: Leaf = {
  initial: 0.1,
  to: 1,
  duration: 300,
  via: [
    { level: 0.8, duration: 300, easing: Easing.quad },
    { level: 0.3, duration: 400 },
  ],
};

const timingOf = (easing: Leaf['easing']): ReferenceCase => ({
  flow: 'layout',
  leaves: {
    originX: { duration: 1500, easing },
    originY: { duration: 1500 },
    opacity: { duration: 1500, easing, initial: 1, to: 0.2 },
  },
  places: [START, { ...END, opacity: 0.2 }],
  totalMs: 1500,
});

/** One case for each class of animation that the native suites play. */
export const REFERENCE_CASES: Record<string, ReferenceCase> = {
  'a timing with a linear easing': timingOf(Easing.linear),
  'a timing with a Bezier easing': timingOf(Easing.bezier(0.25, 0.1, 0.25, 1)),
  'a timing with a fitted easing': timingOf(OVERSHOOT),
  'a delay': {
    flow: 'layout',
    leaves: {
      originX: { duration: 900, delays: [400], easing: 'default' },
      originY: { duration: 1300 },
    },
    places: [START, END],
    totalMs: 1300,
  },
  'a delay of no duration': {
    flow: 'layout',
    leaves: {
      originX: { duration: 900, delays: [0], easing: 'default' },
      originY: { duration: 900 },
    },
    places: [START, END],
    totalMs: 900,
  },
  'a sequence': {
    flow: 'layout',
    leaves: {
      originX: {
        duration: 500,
        via: [
          { level: 0.7, duration: 400, easing: 'default' },
          { level: 0.3, duration: 300, delay: 200 },
        ],
      },
      originY: { duration: 1400 },
    },
    places: [START, END],
    totalMs: 1400,
  },
  'a sequence that comes back to its start value': {
    flow: 'exiting',
    leaves: {
      originX: { duration: 1200, to: 80 },
      opacity: {
        initial: 1,
        to: 1,
        duration: 400,
        via: [
          { to: 0.4, duration: 500, easing: 'default' },
          { to: 0.5, duration: 300 },
        ],
      },
    },
    places: [END, undefined],
    totalMs: 1200,
  },
  'a sequence with timings of no duration': {
    flow: 'layout',
    leaves: {
      originX: {
        duration: 300,
        via: [
          { level: 0.5, duration: 0 },
          { level: 0.2, duration: 400 },
          { level: 0.6, duration: 0 },
          { level: 0.9, duration: 0, delay: 100 },
        ],
      },
    },
    places: [START, { ...START, left: PAIR_LEFT }],
    totalMs: 800,
    isFrameDriven: true,
  },
  'a keyframe animation': {
    flow: 'entering',
    leaves: { opacity: KEYFRAME_POINTS },
    places: [undefined, END],
    totalMs: 1000,
    builder: () => opacityKeyframeOf(KEYFRAME_POINTS),
  },
  'transform operations': {
    flow: 'layout',
    leaves: {},
    operations: [
      ['translateX', 0, 80, { duration: 1200 }],
      ['scale', 0.5, 1, { duration: 600, delays: [300], easing: 'default' }],
    ],
    places: [START, END],
    totalMs: 1200,
  },
  'a rotation': {
    flow: 'layout',
    leaves: {},
    operations: [['rotate', '0deg', '90deg', { duration: 1200 }]],
    places: [START, END],
    totalMs: 1200,
  },
  'two operations of one kind': {
    flow: 'layout',
    leaves: {},
    operations: [
      ['rotate', '0deg', '60deg', { duration: 1200 }],
      ['rotate', '10deg', '40deg', { duration: 600, easing: 'default' }],
    ],
    places: [START, END],
    totalMs: 1200,
  },
  'a perspective': {
    flow: 'layout',
    leaves: {},
    operations: [
      ['perspective', 40, 40, { duration: 1200 }],
      ['rotateX', '60deg', '0deg', { duration: 1200 }],
    ],
    places: [START, END],
    totalMs: 1200,
  },
  'a matrix operation': {
    flow: 'layout',
    leaves: { originX: { duration: 800 } },
    operations: [['matrix', SHEAR, SHEAR, { isPlain: true }]],
    places: [START, { ...START, left: PAIR_LEFT }],
    totalMs: 800,
    isFrameDriven: true,
  },
  'a transform replacement': {
    flow: 'layout',
    leaves: {},
    operations: [
      ['translateX', 0, 80, { duration: 1200 }],
      ['translateY', 0, 60, { duration: 1200, easing: 'default' }],
    ],
    replacement: {
      leaves: {},
      operations: [
        ['translateX', 50, 10, { duration: 900 }],
        ['translateY', 30, 0, { duration: 600 }],
      ],
    },
    places: [START, END, START],
    commitTimesMs: [500],
    totalMs: 900,
  },
  'a size': {
    flow: 'layout',
    leaves: {
      width: { duration: 1200 },
      height: { duration: 1200, easing: 'default' },
    },
    places: [START, { ...START, width: 120, height: 90 }],
    totalMs: 1200,
  },
  'a position change and a size change': {
    flow: 'layout',
    leaves: {
      originX: { duration: 1200, easing: 'default' },
      originY: { duration: 900 },
      width: { duration: 600, delays: [300] },
      height: { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
    },
    places: [START, { ...END, width: 101, height: 81 }],
    totalMs: 1200,
  },
  'a border radius': {
    flow: 'layout',
    leaves: {
      originX: { duration: 800 },
      borderRadius: { duration: 800, initial: 0, to: 20 },
    },
    places: [START, { ...START, left: PAIR_LEFT, borderRadius: 20 }],
    totalMs: 800,
    isFrameDriven: true,
  },
  'an entering animation': {
    flow: 'entering',
    leaves: {
      opacity: { duration: 1200, initial: 0.2, to: 1 },
      originX: { duration: 1200, initial: -80, easing: 'default' },
    },
    places: [undefined, END],
    totalMs: 1200,
  },
  'an exiting animation': {
    flow: 'exiting',
    leaves: {
      opacity: { duration: 1200, initial: 1, to: 0.2 },
      originX: { duration: 1200, to: 80, easing: 'default' },
    },
    places: [END, undefined],
    totalMs: 1200,
  },
  'a replacement': {
    flow: 'layout',
    leaves: { originX: { duration: 1500 }, originY: { duration: 1500 } },
    places: [START, END, { ...END, left: PAIR_LEFT / 4 }],
    commitTimesMs: [500],
    totalMs: 1500,
  },
  'a replacement with a new duration and easing': {
    flow: 'layout',
    leaves: { originX: { duration: 1500 }, originY: { duration: 1500 } },
    replacement: {
      leaves: {
        originX: { duration: 900, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
        originY: { duration: 900 },
      },
      isFrameDriven: true,
    },
    places: [START, { ...START, left: PAIR_LEFT }, END],
    commitTimesMs: [500],
    totalMs: 900,
  },
  'a replacement with a delay': {
    flow: 'layout',
    leaves: { originX: { duration: 1500 } },
    replacement: {
      leaves: { originX: { duration: 600, delays: [300] } },
      isFrameDriven: true,
    },
    places: [
      START,
      { ...START, left: PAIR_LEFT },
      { ...START, left: PAIR_LEFT / 4 },
    ],
    commitTimesMs: [500],
    totalMs: 900,
  },
  'a hand-over to the frame driver': {
    flow: 'layout',
    leaves: {
      originX: { duration: 1800, onlyWhenChanged: true },
      originY: { isSpring: true, onlyWhenChanged: true },
    },
    places: [START, { ...START, left: PAIR_LEFT }, END],
    commitTimesMs: [600],
    totalMs: 1800,
  },
};

type Reader = Pick<ScalarKey, 'target' | 'tolerance'> & {
  /** Of a position key: the size key of its axis. */
  sizeKey?: string;
};

export const MATRIX_TOLERANCE = {
  cells: 0.005,
  translation: POSITION_TOLERANCE,
};

const READERS: Record<string, Reader> = {
  originX: {
    target: 'PositionX',
    tolerance: POSITION_TOLERANCE,
    sizeKey: 'width',
  },
  originY: {
    target: 'PositionY',
    tolerance: POSITION_TOLERANCE,
    sizeKey: 'height',
  },
  width: { target: 'Width', tolerance: POSITION_TOLERANCE },
  height: { target: 'Height', tolerance: POSITION_TOLERANCE },
  opacity: { target: 'Opacity', tolerance: OPACITY_TOLERANCE },
  borderRadius: { target: 'BorderRadius', tolerance: POSITION_TOLERANCE },
};

const LAYOUT_KEYS = ['originX', 'originY', 'width', 'height'];

/** A frame check with the key that its leaf declares. */
export type LeafCheck = FrameCheck & {
  declared: DeclaredKey;
  replaced?: LeafCheck;
};

export type Samples = Record<BoxName, Record<string, TargetSample>>;

export type Played = {
  rows: TakenRow<Samples>[];
  /** After the callbacks, when the boxes are mounted. */
  end?: Samples;
  tracks: PlayedTrack[];
  captures: Capture[];
  frameChecks: LeafCheck[];
  /** The last declaration of each key that has a timeline. */
  endKeys: DeclaredKey[];
  clockOffset: Band;
  /** What the callbacks do not have of `expectedCallbacksOf`. */
  missingCallbacks: string;
};

const CLOCK_REF = 'NativeLayoutReferenceClock';
const BOXES: Record<BoxName, string> = {
  native: BOX_REF,
  frame: FRAME_BOX_REF,
};

/**
 * Plays a case on the native box and on its frame-driven twin, with rows of
 * samples of the two boxes from the first commit to the end.
 */
export async function play(referenceCase: ReferenceCase): Promise<Played> {
  const { places, commitTimesMs = [], totalMs } = referenceCase;
  const commits = places.slice(1).map((_, commit) => commit);
  const animations = commits.map((commit) =>
    animationsOf(referenceCase, commit)
  );
  const sceneOf = (commit: number, place?: Place) => (
    <ReferenceScene
      animations={animations[commit]}
      place={place}
      transform={transformOf(declarationOf(referenceCase, commit))}
    />
  );
  const targets = targetsOf(referenceCase);
  resetFrameRecords();
  await render(sceneOf(0, places[0]));
  await wait(200);
  const clockOffset = await narrowClockOffset(
    getTestComponent(CLOCK_REF).getTag()
  );
  await takeTrace();
  resetCallbacks();
  const mountedTags = places[0] && tagsOf();

  const rows: TakenRow<Samples>[] = [];
  let startMs = 0;
  let tags = mountedTags;
  for (const commit of commits) {
    await render(sceneOf(commit, places[commit + 1]));
    startMs ||= performance.now();
    tags ??= tagsOf();
    const commitTags = tags;
    const untilMs =
      startMs +
      (commitTimesMs[commit] ?? (lastOf(commitTimesMs) ?? 0) + totalMs);
    rows.push(
      ...(await takeRows(
        () => takeSamples(targets, commitTags),
        ({ native }) => native[targets[0]],
        untilMs
      ))
    );
  }
  const missingCallbacks = await waitForCallbacks(
    expectedCallbacksOf(referenceCase)
  );
  const end = lastOf(places) && (await takeSamples(targets, tags!));
  const events = (await takeTrace()).filter(({ tag }) => tag === tags!.native);
  const builtKeys: BuiltKey[][] = [];
  for (const commit of commits) {
    builtKeys.push(
      builtKeysOf(referenceCase, commit, builtKeys[commit - 1] ?? [])
    );
  }
  const declaredKeys = builtKeys.flat().map(({ declared }) => declared);
  const tracks = tracksOf(referenceCase, builtKeys, events, clockOffset);
  return {
    rows,
    end,
    tracks,
    captures: capturesOf(events, tracks),
    frameChecks: frameChecksOf(declaredKeys, readFrameRecords()),
    endKeys: declaredKeys.filter(
      (key, index) =>
        !declaredKeys.slice(index + 1).some((later) => isSameLeaf(later, key))
    ),
    clockOffset,
    missingCallbacks,
  };
}

/**
 * Each animation gives its callback `true` one time, after one `false` for each
 * commit that came during it.
 */
export const expectedCallbacksOf = ({ places }: ReferenceCase) =>
  (Object.keys(BOXES) as BoxName[]).flatMap((box) =>
    places.slice(1).map((_, commit) => `${box}:${commit === places.length - 2}`)
  );

/** A track that the frame driver took, with its hand-over window. */
export type HandOver = {
  track: ScalarTrack;
  /** The start call of the frame driver for the key on the native box. */
  startCallMs: number;
  /** To one display frame after the end report of the track. */
  window: Band;
};

export function handOversOf(played: Played): HandOver[] {
  const clock = middleOf(played.clockOffset);
  return played.tracks.filter(isScalarTrack).flatMap((track): HandOver[] => {
    if (track.finished !== false || isReplaced(played, track)) {
      return [];
    }
    const [startCallMs] = played.frameChecks.flatMap(({ record }) =>
      record.box === 'native' &&
      isSameLeaf(record, track) &&
      record.start !== undefined &&
      record.start.timeMs + clock >= track.played.from
        ? [record.start.timeMs + clock]
        : []
    );
    return startCallMs === undefined
      ? []
      : [
          {
            track,
            startCallMs,
            window: { from: startCallMs, to: track.played.to + FRAME_MS },
          },
        ];
  });
}

export const isReplaced = ({ tracks }: Played, track: PlayedTrack) =>
  tracks.some(({ replaced }) => replaced === track);

/**
 * The mark of a read of a track from the start call of the frame driver for its
 * key to its end report: Objective 12H measured that the layer can show the
 * model plus the offset of the track there.
 */
export const defectMarkOf = (
  handOvers: HandOver[],
  track: PlayedTrack,
  timeMs: number
) =>
  handOvers.some(
    (handOver) =>
      handOver.track === track &&
      timeMs >= handOver.startCallMs &&
      timeMs < track.played.to
  )
    ? ['defect 12H']
    : [];

const transformOf = ({ operations }: Declaration) =>
  operations && endTransformOf(operations);

const declarationOf = (
  referenceCase: ReferenceCase,
  commit: number
): Declaration =>
  commit > 0 && referenceCase.replacement
    ? referenceCase.replacement
    : referenceCase;

/** The last operations that a case declares. */
export const endOperationsOf = (referenceCase: ReferenceCase) =>
  declarationOf(referenceCase, referenceCase.places.length - 2).operations;

export const targetsOf = (referenceCase: ReferenceCase) => [
  ...new Set(
    [referenceCase, referenceCase.replacement ?? referenceCase].flatMap(
      ({ leaves, operations = [] }) => [
        ...Object.keys(leaves).map((key) => READERS[key].target),
        ...operations.map(() => 'Transform'),
      ]
    )
  ),
];

/** The keyframe animation that has the timings of an opacity leaf as its points. */
function opacityKeyframeOf(leaf: Leaf) {
  const timeline = declaredTimelineOf(leaf, leaf.initial as number, leaf.to!);
  const { from, phases } = timeline;
  const totalMs = declaredDurationOf(timeline);
  const definitions: ConstructorParameters<typeof Keyframe>[0] = {
    0: { opacity: from },
  };
  let endMs = 0;
  for (const { durationMs, move } of phases) {
    endMs += durationMs;
    definitions[(100 * endMs) / totalMs] = {
      opacity: move!.to,
      easing: move!.curve,
    };
  }
  return new Keyframe(definitions).duration(
    totalMs
  ) as unknown as CallbackBuilder;
}

function ReferenceScene({
  animations,
  place,
  transform,
}: {
  animations: Record<BoxName, Animations>;
  place?: Place;
  transform: ViewStyle['transform'];
}) {
  const clockRef = useTestRef(CLOCK_REF);
  return (
    <View>
      <View ref={clockRef} collapsable={false} />
      {(Object.keys(BOXES) as BoxName[]).map((box) => (
        <View key={box} collapsable={false} style={styles.pairCell}>
          {place && (
            <ReferenceBox
              refName={BOXES[box]}
              animations={animations[box]}
              place={place}
              transform={transform}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function ReferenceBox({
  refName,
  animations,
  place,
  transform,
}: {
  refName: string;
  animations: Animations;
  place: Place;
  transform: ViewStyle['transform'];
}) {
  const ref = useTestRef(refName);
  const { originX, originY, ...style } = restOf(place);
  return (
    <Animated.View
      ref={ref}
      {...animations}
      style={[
        styles.box,
        style,
        { marginLeft: originX, marginTop: originY, transform },
      ]}
    />
  );
}

/** The value of each key of a box at rest in a place. */
const restOf = ({
  left,
  top,
  opacity = 1,
  width = BOX_SIZE,
  height = BOX_SIZE,
  borderRadius = 0,
}: Place): Record<string, number> => ({
  originX: left,
  originY: top,
  opacity,
  width,
  height,
  borderRadius,
});

/**
 * The twin of an animation of `layoutOf` has a callback on each timing, so it
 * has no native form.
 */
function animationsOf(
  referenceCase: ReferenceCase,
  commit: number
): Record<BoxName, Animations> {
  const { flow, builder } = referenceCase;
  const { leaves, operations } = declarationOf(referenceCase, commit);
  const animationOf = flow === 'layout' ? layoutOf : entryExitOf;
  const built = (box: BoxName, isFrameDriven: boolean): AnimationSource => {
    if (builder) {
      const animation = builder().withCallback(callbackOf(box));
      return isFrameDriven ? frameDrivenOf(animation) : animation;
    }
    return animationOf(
      Object.fromEntries(
        Object.entries(leaves).map(([key, leaf]) => [
          key,
          { ...leaf, hasCallback: isFrameDriven },
        ])
      ),
      {
        name: box,
        transform: operations && {
          operations,
          shared: { hasCallback: isFrameDriven },
        },
      }
    );
  };
  return {
    native: { [flow]: frameRecordedOf('native', built('native', false)) },
    frame: { [flow]: frameRecordedOf('frame', built('frame', true)) },
  };
}

const lastOf = <TItem,>(items: TItem[]): TItem | undefined =>
  items[items.length - 1];

type Tags = Record<BoxName, number>;

const tagsOf = (): Tags => ({
  native: getTestComponent(BOX_REF).getTag(),
  frame: getTestComponent(FRAME_BOX_REF).getTag(),
});

/**
 * The samples of one request step: they are next to each other in the host
 * queue.
 */
async function takeSamples(targets: string[], tags: Tags): Promise<Samples> {
  const samplesOf = async (box: BoxName) =>
    Object.fromEntries(
      await Promise.all(
        targets.map(
          async (target) => [target, await sample(tags[box], target)] as const
        )
      )
    );
  const [native, frame] = await Promise.all([
    samplesOf('native'),
    samplesOf('frame'),
  ]);
  return { native, frame };
}

type BuiltKey = {
  declared: DeclaredKey;
  /**
   * The native route starts no track for the key, and its live track goes on:
   * the commit gives the key the end value and the leaf that it has from the
   * commit before. It is the kit's form of the relation `continues` of
   * `relateToLiveLeaf` of the package: a timing with the end value and the form
   * of the live timing. `tracksOf` checks it against the tracks that each
   * command started.
   */
  continuesTrack: boolean;
};

/**
 * What a commit declares for each key whose leaf its builder makes. A spring
 * and an operation with a matrix value have no timeline. A key of
 * `earlierKeys`, the keys of the commit before, is in flight: it is not at its
 * target value, so its builder makes its leaf.
 */
function builtKeysOf(
  referenceCase: ReferenceCase,
  commit: number,
  earlierKeys: BuiltKey[]
): BuiltKey[] {
  const { flow, places } = referenceCase;
  const { leaves, operations = [] } = declarationOf(referenceCase, commit);
  const earlier: Partial<Declaration> =
    commit > 0 ? declarationOf(referenceCase, commit - 1) : {};
  const earlierLeaves: Record<string, Leaf> = earlier.leaves ?? {};
  const inFlight = earlierKeys.map(({ declared }) => declared.key);
  const [before, after] = [places[commit], places[commit + 1]].map(
    (place) => place && restOf(place)
  );
  const rest = (after ?? before)!;
  return [
    ...Object.entries(leaves).flatMap(([key, leaf]): BuiltKey[] => {
      const isChanged = flow !== 'layout' || before![key] !== rest[key];
      const isAtTarget = !isChanged && !inFlight.includes(key);
      if (leaf.isSpring || (leaf.onlyWhenChanged && isAtTarget)) {
        return [];
      }
      const initial = leaf.initial as number | undefined;
      const { from, ...end } = LAYOUT_KEYS.includes(key)
        ? {
            from: (before ?? rest)[key] + (initial ?? 0),
            to: rest[key] + (leaf.to ?? 0),
            base: rest[key],
          }
        : { from: initial!, to: leaf.to! };
      const { sizeKey, ...reader } = READERS[key];
      return [
        {
          declared: {
            ...reader,
            key,
            leaf,
            from,
            ...end,
            startsOnScreen: from === before?.[key],
            size: sizeKey ? { key: sizeKey, rest: rest[sizeKey] } : undefined,
          },
          continuesTrack: !isChanged && leaf === earlierLeaves[key],
        },
      ];
    }),
    ...operations.flatMap(([kind, from, to, leaf = {}], index): BuiltKey[] =>
      typeof from === 'object' || typeof to === 'object'
        ? []
        : [
            {
              declared: {
                key: kind,
                operation: index,
                target: 'Transform',
                leaf,
                from,
                to,
                startsOnScreen: false,
              },
              continuesTrack: operations === earlier.operations,
            },
          ]
    ),
  ];
}

/**
 * Each commit that gives a key a new native timeline starts one command, with
 * one track for each target of those keys.
 */
function tracksOf(
  referenceCase: ReferenceCase,
  builtKeys: BuiltKey[][],
  events: TraceEvent[],
  clockOffset: Band
) {
  const commands = events.filter(({ event }) => event === 'Admitted');
  const tracks: PlayedTrack[] = [];
  builtKeys.forEach((keys, commit) => {
    const started = keys
      .filter(({ continuesTrack }) => !continuesTrack)
      .map(({ declared }) => declared);
    if (
      started.length === 0 ||
      declarationOf(referenceCase, commit).isFrameDriven
    ) {
      return;
    }
    const command = commands.shift();
    if (!command) {
      throw new Error(
        `The trace has no command of the commit ${commit}: ${summarize(events)}`
      );
    }
    const startedTargets = events
      .filter(
        (event) => event.event === 'TrackStarted' && isOfCommand(event, command)
      )
      .map(({ target }) => target);
    const declaredTargets = [...new Set(started.map(({ target }) => target))];
    if (startedTargets.sort().join() !== declaredTargets.sort().join()) {
      throw new Error(
        `The command of the commit ${commit} started the tracks ${startedTargets.join()}, and the case declares ${declaredTargets.join()}.`
      );
    }
    tracks.push(
      ...playedTracksOf(
        events,
        command,
        clockOffset,
        started,
        [...tracks].reverse()
      )
    );
  });
  if (commands.length > 0) {
    throw new Error(
      `The trace has a command that the case does not declare: ${summarize(events)}`
    );
  }
  return tracks;
}

/**
 * The records of the keys that have a timeline, each with its timeline: record
 * n of a leaf of a box is of declaration n of the leaf. A timing that adopts a
 * start has its own duration and easing from the adopted start value (`onStart`
 * of `withTiming` of the package). A leaf that starts on screen after a leaf
 * starts at the value of its start call.
 */
function frameChecksOf(declaredKeys: DeclaredKey[], records: FrameRecord[]) {
  const checks: LeafCheck[] = [];
  for (const record of records) {
    const earlier = checks.filter(
      (check) =>
        check.record.box === record.box && isSameLeaf(check.record, record)
    );
    const declared = declaredKeys.filter((key) => isSameLeaf(key, record))[
      earlier.length
    ];
    if (!declared) {
      continue;
    }
    const replaced = lastOf(earlier);
    const startValue =
      record.adoptedStart?.value ??
      (declared.startsOnScreen && replaced ? record.start?.value : undefined) ??
      declared.from;
    checks.push({
      record,
      declared,
      replaced,
      timeline: declaredTimelineOf(
        declared.leaf,
        startValue,
        declared.to,
        declared.base
      ),
    });
  }
  return checks.filter(({ record }) => record.frames.length > 0);
}
