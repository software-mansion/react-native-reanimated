/*
 * The development trace gives the clause of each refusal of a native layout start, the other command of a
 * conflict, and a platform end that a stop or a replacement made obsolete. The tests read the trace; they
 * do not prove pixels.
 */
import React from 'react';
import { Platform } from 'react-native';
import {
  Easing,
  FadeOut,
  Keyframe,
  LinearTransition,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { blockUIThread } from './nativeLayoutLoad';
import type {
  CommandHandle,
  LayoutOptions,
  Leaves,
  Operation,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_SIZE,
  callbacks,
  DURATION,
  END_LEFT,
  endTransformOf,
  hasNativeLayoutRoute,
  isOfCommand,
  layoutOf,
  mountScene,
  movingGeometryTest,
  PLAYS_3D_OPERATIONS,
  PLAYS_MOVING_GEOMETRY,
  REFUSES_OPACITY_UNDER_FILTER,
  renderBox,
  Scene,
  SizeScene,
  START_LEFT,
  takeTrace,
  takeTraceOf,
  WRITES_ANIMATION_MATRIX,
} from './nativeLayoutTestKit';
import type { BoxProps } from './nativeLayoutTestKit';

const IS_APPLE = Platform.OS === 'ios';
const TURN: Operation = ['rotate', 0, 1];
const WIDER = { width: 2 * BOX_SIZE, height: BOX_SIZE };

const transformCase = (
  operations: Operation[],
  transform = endTransformOf(operations),
  box: Partial<BoxProps> = {}
): [LayoutOptions, Partial<BoxProps>] => [
  { transform: { operations } },
  { transform, ...box },
];

/**
 * `<failure>:<cause>` of the build failure of the start, or the events when the
 * start has none.
 */
function refusalOf(events: TraceEvent[]) {
  const failure = events.find(({ event }) => event === 'LayoutBuildFailed');
  return failure
    ? `${failure.buildFailure}:${failure.buildFailureCause}`
    : `no build failure: ${events.map(({ event }) => event).join(' > ')}`;
}

/**
 * The cause of a moving geometry track that the build of this platform refuses
 * before the view rules.
 */
const movingGeometryCauseOr = (cause: string) =>
  PLAYS_MOVING_GEOMETRY ? cause : 'ApiLevel';

type RefusedBuild = [
  caseName: string,
  leaves: Leaves,
  refusal: string,
  options?: LayoutOptions,
  box?: Partial<BoxProps>,
];

const REFUSED_BUILDS: RefusedBuild[] = [
  [
    'a leaf of a key with no native target',
    { borderRadius: { initial: 0, to: 0 }, originX: {} },
    'UnsupportedTarget:UnknownKey',
  ],
  [
    'a transform leaf on a view with a transform origin',
    {},
    `UnsupportedTarget:${movingGeometryCauseOr('SizeDependentTransform')}`,
    ...transformCase([TURN], undefined, { transformOrigin: 'top left' }),
  ],
  [
    'a transform leaf on a view with a translation in percent',
    {},
    `UnsupportedTarget:${movingGeometryCauseOr('SizeDependentTransform')}`,
    ...transformCase(
      [['translateX', 25, 25], TURN],
      [{ translateX: '50%' }, { rotate: '1rad' }]
    ),
  ],
  [
    'more leaves than native targets',
    {
      originX: {},
      originY: {},
      width: {},
      height: {},
      opacity: { initial: 1, to: 1 },
      borderRadius: { initial: 0, to: 0 },
    },
    'ResourceLimit:leaves',
    { transform: { operations: [['rotate', 0, 0]] } },
  ],
  [
    'more operations than the limit',
    {},
    'ResourceLimit:transformOperations',
    ...transformCase([
      TURN,
      ['translateX', 0, 10],
      ['translateY', 0, 10],
      ['scaleX', 1, 2],
      ['scaleY', 1, 2],
    ]),
  ],
  [
    'more segments than the native route takes',
    {
      originX: { easing: Easing.bounce },
      width: { easing: Easing.bounce, initial: 10 },
      opacity: { easing: Easing.bounce, initial: 0.5, to: 1 },
    },
    'ResourceLimit:segments',
  ],
  ...(REFUSES_OPACITY_UNDER_FILTER
    ? [
        [
          'an opacity leaf on a view with an opacity filter',
          { originX: {}, opacity: { initial: 1, to: 1 } },
          'UnsupportedTarget:OpacityFilter',
          undefined,
          { hasOpacityFilter: true },
        ] satisfies RefusedBuild,
      ]
    : []),
  ...(WRITES_ANIMATION_MATRIX && PLAYS_MOVING_GEOMETRY
    ? [
        [
          'a view with a skew model transform',
          { originX: {}, originY: {} },
          'UnsupportedTarget:Skew',
          undefined,
          { transform: [{ skewX: '20deg' }] },
        ] satisfies RefusedBuild,
        [
          'a final scale of 0 with a transform track',
          {},
          'UnsupportedTarget:SingularMatrix',
          ...transformCase([['scale', 1, 0]]),
        ] satisfies RefusedBuild,
      ]
    : []),
  ...(!PLAYS_3D_OPERATIONS && PLAYS_MOVING_GEOMETRY
    ? [
        [
          'a rotateX operation',
          {},
          'UnsupportedTarget:NonPlanarTransform',
          ...transformCase([['rotateX', '0deg', '40deg']]),
        ] satisfies RefusedBuild,
      ]
    : []),
];

const SIZE_REFUSALS: [
  caseName: string,
  host: 'View' | 'Text',
  cause: string,
][] = [
  [
    'a size change of a Text',
    'Text',
    IS_APPLE ? 'SizeChangeOnComponent' : 'SizeBeyondOnePixel',
  ],
  [
    'a size change of a View with an elliptical radius',
    'View',
    IS_APPLE ? 'SizeDependentPicture' : 'SizeBeyondOnePixel',
  ],
];

/**
 * The exiting keyframe of the example screen `KeyframeAnimation`: its rotation
 * starts after 10 %.
 */
const LATE_ROTATION_EXIT = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }, { rotateZ: '0deg' }] },
  10: {
    opacity: 1,
    transform: [{ translateY: 25 }, { rotateZ: '0deg' }],
    easing: Easing.exp,
  },
  50: { opacity: 0.5, transform: [{ translateY: -200 }, { rotateZ: '60deg' }] },
  100: { opacity: 0, transform: [{ translateY: -500 }, { rotateZ: '120deg' }] },
}).duration(1000);

describe('native layout refusal causes', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [caseName, leaves, refusal, options, box] of REFUSED_BUILDS) {
    test(`${caseName} keeps the animation frame-driven: ${refusal}`, async () => {
      const layout = layoutOf(leaves, { ...options, name: 'refused' });
      const tag = await renderBox({ layout, ...box });
      await render(<Scene left={END_LEFT} layout={layout} {...box} />);
      await wait(DURATION * 1.5);
      expect(refusalOf(await takeTraceOf(tag))).toBe(refusal);
      await render(null);
    });
  }

  for (const [caseName, host, cause] of SIZE_REFUSALS) {
    test(`${caseName} keeps the animation frame-driven: UnsupportedTarget:${cause}`, async () => {
      const layout = LinearTransition.duration(DURATION).easing(Easing.linear);
      const style = host === 'View' ? { borderRadius: '30%' as const } : {};
      const tag = await mountScene(
        <SizeScene host={host} style={style} layout={layout} />
      );
      await render(
        <SizeScene host={host} style={style} {...WIDER} layout={layout} />
      );
      await wait(DURATION * 1.5);
      expect(refusalOf(await takeTraceOf(tag))).toBe(
        `UnsupportedTarget:${cause}`
      );
      await render(null);
    });
  }

  if (IS_APPLE) {
    test('an exiting keyframe whose rotation starts after 10 % keeps the exit frame-driven: UnsupportedTarget:EdgeAntialiasing', async () => {
      const tag = await renderBox({ exiting: LATE_ROTATION_EXIT });
      await render(
        <Scene
          left={START_LEFT}
          exiting={LATE_ROTATION_EXIT}
          isMounted={false}
        />
      );
      await wait(1500);
      expect(refusalOf(await takeTraceOf(tag))).toBe(
        'UnsupportedTarget:EdgeAntialiasing'
      );
      await render(null);
    });

    test('a springified exit keeps the exit frame-driven: UnsupportedTarget:SpringForm', async () => {
      const exiting = new FadeOut().springify();
      const tag = await renderBox({ exiting });
      await render(
        <Scene left={START_LEFT} exiting={exiting} isMounted={false} />
      );
      await wait(1500);
      expect(refusalOf(await takeTraceOf(tag))).toBe(
        'UnsupportedTarget:SpringForm'
      );
      await render(null);
    });
  }
});

const NATIVE_MOVE = layoutOf({ originX: {}, originY: {} }, { name: 'native' });
const STEPPED_MOVE = layoutOf(
  { originX: { easing: Easing.steps(4) } },
  { name: 'stepped' }
);

/** The events of the layout domain that say how a start of the view goes on. */
const PROXY_ROUTE_EVENTS = [
  'LayoutStartPending',
  'LayoutBuildFailed',
  'LayoutStartRefused',
];
const proxyRouteEventsOf = (events: TraceEvent[]) =>
  events.filter(({ event }) => PROXY_ROUTE_EVENTS.includes(event));

describe('native layout start refusals', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  test('a layout change during a frame-driven layout animation of the view is refused: FrameDrivenState', async () => {
    const tag = await renderBox({ layout: STEPPED_MOVE });
    await render(<Scene left={END_LEFT} layout={STEPPED_MOVE} />);
    await wait(DURATION / 4);
    await render(<Scene left={START_LEFT} layout={STEPPED_MOVE} />);
    await wait(DURATION * 1.5);
    expect(
      proxyRouteEventsOf(await takeTraceOf(tag))
        .map(
          ({ event, buildFailure, startRefusal }) =>
            `${event}:${buildFailure ?? startRefusal}`
        )
        .join(' > ')
    ).toBe(
      'LayoutBuildFailed:UnsupportedTiming > LayoutStartRefused:FrameDrivenState'
    );
    await render(null);
  });

  test('each layout start of a view with the native route on has one route event of the layout domain', async () => {
    const tag = await renderBox({ layout: NATIVE_MOVE });
    for (const left of [END_LEFT, START_LEFT, END_LEFT]) {
      await render(<Scene left={left} layout={NATIVE_MOVE} />);
      await wait(DURATION / 4);
    }
    await wait(DURATION * 1.5);
    expect(proxyRouteEventsOf(await takeTraceOf(tag)).length).toBe(3);
    await render(null);
  });

  movingGeometryTest(
    'a mounted layout start has the trace objective of its pending start',
    async () => {
      const tag = await renderBox({ layout: NATIVE_MOVE });
      await render(<Scene left={END_LEFT} layout={NATIVE_MOVE} />);
      await wait(DURATION * 1.5);
      const events = await takeTraceOf(tag);
      const objectiveOf = (type: string) =>
        events.find(({ event }) => event === type)?.objective;
      expect(`${objectiveOf('LayoutStartPending')}`).toBe('7');
      expect(`${objectiveOf('LayoutStartMounted')}`).toBe('7');
      await render(null);
    }
  );

  test('a mounted exiting start has the trace objective of its pending start', async () => {
    const exiting = new FadeOut().duration(DURATION).easing(Easing.linear);
    const tag = await renderBox({ exiting });
    await render(
      <Scene left={START_LEFT} exiting={exiting} isMounted={false} />
    );
    await wait(DURATION * 1.5);
    const events = await takeTraceOf(tag);
    const objectiveOf = (type: string) =>
      events.find(({ event }) => event === type)?.objective;
    expect(`${objectiveOf('LayoutStartPending')}`).toBe('11');
    expect(`${objectiveOf('LayoutStartMounted')}`).toBe('11');
    await render(null);
  });
});

const handleOf = ({ surfaceId, tag, owner, generation }: CommandHandle) => ({
  surfaceId,
  tag,
  owner,
  generation,
});

const describeHandle = (handle: CommandHandle | undefined) =>
  handle ? `${handle.owner} ${handle.tag}.${handle.generation}` : 'none';

describe('native layout conflict owners', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'each end event of a replaced layout command names the command that replaces it',
    async () => {
      const tag = await renderBox({ layout: NATIVE_MOVE });
      await render(<Scene left={END_LEFT} layout={NATIVE_MOVE} />);
      await wait(DURATION / 4);
      await render(<Scene left={START_LEFT} layout={NATIVE_MOVE} />);
      await wait(DURATION * 1.5);
      const events = await takeTraceOf(tag);
      const [replaced, replacement] = events
        .filter(({ event }) => event === 'Admitted')
        .map(handleOf);
      const conflictEnds = events.filter(
        (event) =>
          isOfCommand(event, replaced) &&
          ((event.event === 'TrackEnded' && event.finished === false) ||
            (event.event === 'Ended' && event.outcome === 'Interrupted'))
      );
      expect(conflictEnds.some(({ event }) => event === 'Ended')).toBe(true);
      for (const end of conflictEnds) {
        expect(describeHandle(end.conflictHandle)).toBe(
          describeHandle(replacement)
        );
      }
      await render(null);
    }
  );
});

const HANDOVER_TRIES = 10;
const TRACK_MS = 400;
const BLOCK_FROM_MS = 350;
const BLOCK_MS = 150;
const HANDOVER_AT_MS = 450;
const HANDED_OVER_MOVE = layoutOf(
  { originX: { hasCallback: true } },
  { name: 'frame' }
);

describe('a platform end in the queue at a mounted stop', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a hand-over commit after the end of a native track, in a block of the main thread: the callback has one result',
    async () => {
      const ignoredTries: number[] = [];
      for (let attempt = 0; attempt < HANDOVER_TRIES; attempt++) {
        const native = layoutOf(
          { originX: { duration: TRACK_MS } },
          { name: 'native' }
        );
        const tag = await renderBox({ layout: native });
        await takeTrace({ keepsIgnoredEnds: true });
        callbacks.length = 0;
        await render(<Scene left={END_LEFT} layout={native} />);
        await wait(BLOCK_FROM_MS);
        scheduleOnUI(() => {
          'worklet';
          blockUIThread(BLOCK_MS);
        });
        await wait(HANDOVER_AT_MS - BLOCK_FROM_MS);
        await render(<Scene left={END_LEFT / 2} layout={HANDED_OVER_MOVE} />);
        await wait(DURATION * 2);
        const events = (await takeTrace({ keepsIgnoredEnds: true })).filter(
          (event) => event.tag === tag
        );
        const nativeCallbacks = callbacks.filter((name) =>
          name.startsWith('native:')
        );
        expect(nativeCallbacks.length).toBe(1);
        if (events.some(({ event }) => event === 'TrackEndIgnored')) {
          ignoredTries.push(attempt);
        }
        console.log(
          `RuntimeTestsIgnoredEnd ${JSON.stringify({
            attempt,
            callbacks: nativeCallbacks,
            trace: events.map(
              ({ event, target, finished, outcome, reason, sequence }) =>
                `${sequence} ${[event, target, finished, outcome, reason].filter((part) => part !== undefined).join(':')}`
            ),
          })}`
        );
        await render(null);
      }
      console.log(
        `RuntimeTestsIgnoredEndCount ${ignoredTries.length} of ${HANDOVER_TRIES}`
      );
    }
  );
});
