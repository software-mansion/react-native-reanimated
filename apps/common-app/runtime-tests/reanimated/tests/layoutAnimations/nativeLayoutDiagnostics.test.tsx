/*
 * The development trace gives the clause of each refusal of a native layout start, the other command of a
 * conflict, and a platform end that a stop or a replacement made obsolete. The tests read the trace; they
 * do not prove pixels.
 */

import { Platform } from 'react-native';
import { Easing, LinearTransition } from 'react-native-reanimated';

import {
  describe,
  expect,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  LayoutOptions,
  Leaves,
  Operation,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_SIZE,
  DURATION,
  END_LEFT,
  endTransformOf,
  hasNativeLayoutRoute,
  layoutOf,
  mountScene,
  PLAYS_3D_OPERATIONS,
  PLAYS_MOVING_GEOMETRY,
  REFUSES_OPACITY_UNDER_FILTER,
  renderBox,
  Scene,
  SizeScene,
  START_LEFT,
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

function refusalOf(events: TraceEvent[]) {
  const failure = events.find(
    ({ event }) =>
      event === 'LayoutStartRefused' || event === 'LayoutBuildFailed'
  );
  if (failure?.event === 'LayoutStartRefused') {
    return `LayoutStartRefused:${failure.startRefusal}`;
  }
  return failure
    ? `${failure.buildFailure}:${failure.buildFailureCause}`
    : `no layout refusal: ${events.map(({ event }) => event).join(' > ')}`;
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

describe('native layout refusal causes', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [caseName, leaves, refusal, options, box] of REFUSED_BUILDS.filter(
    ([, , refusal]) => refusal === 'ResourceLimit:leaves'
  )) {
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
    const refusal = IS_APPLE
      ? `UnsupportedTarget:${cause}`
      : `LayoutStartRefused:${cause}`;
    test(`${caseName} keeps the animation frame-driven: ${refusal}`, async () => {
      const layout = LinearTransition.duration(DURATION).easing(Easing.linear);
      const style = host === 'View' ? { borderRadius: '30%' as const } : {};
      const tag = await mountScene(
        <SizeScene host={host} style={style} layout={layout} />
      );
      await render(
        <SizeScene host={host} style={style} {...WIDER} layout={layout} />
      );
      await wait(DURATION * 1.5);
      expect(refusalOf(await takeTraceOf(tag))).toBe(refusal);
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
});
