/*
 * Cells of the support matrix of the native layout route that the other suites do not have: components other
 * than `View` (a Text, an Image, a custom native view), a mask, private sublayers, a late style that React
 * Native draws from the size during a size track, and the transform cases of the D042 "Not tested" list.
 *
 * Each case plays a native box and its frame-driven twin (`play` of `native layout reference`): statements A
 * and B, and the twin timeline at common times (D054; Apple asserts, Android prints). Beside each native case
 * is a case of the same cell that the route refuses: the whole animation is frame-driven, with its typed
 * failure in `LayoutBuildFailed`.
 */
import React from 'react';
import type { ViewStyle } from 'react-native';
import { Text, View } from 'react-native';
import Animated, {
  getStaticFeatureFlag,
  SharedTransition,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { Place, Played, ReferenceCase } from './nativeLayoutReferencePlay';
import {
  expectAtCommonTime,
  expectNoKeyAfterTransfer,
  expectReference,
  play,
  REFERENCE_CASES,
  routedCaseOf,
} from './nativeLayoutReferencePlay';
import type {
  Operation,
  SizeBoxProps,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  END_LEFT,
  FRAME_BOX_REF,
  FRAME_MS,
  hasNativeLayoutRoute,
  isNear,
  layoutOf,
  movingGeometryTest,
  NATIVE_ANIMATION_ROUTES,
  opacities,
  PAIR_CELL_HEIGHT,
  PAIR_DURATION,
  PAIR_LEFT,
  PAIR_TOP,
  PLAYS_MOVING_GEOMETRY,
  PLAYS_SIZE_CHANGE,
  PLAYS_TRANSFORM_ON_EACH_COMPONENT,
  POSITION_TOLERANCE,
  sample,
  SharedScreens,
  SizeBox,
  START_LEFT,
  summarize,
  WriterBox,
} from './nativeLayoutTestKit';

const START: Place = { left: START_LEFT, top: 0 };
const END: Place = { left: PAIR_LEFT, top: PAIR_TOP };
const MATRIX_DURATION = 1200;

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);
const NO_EDGES = [] as const;

/**
 * A box whose host is `RNCSafeAreaView`, a Fabric component of a library, with
 * no inset.
 */
function CustomViewBox({
  left = 0,
  top = 0,
  width = BOX_SIZE,
  height = BOX_SIZE,
  style,
  layout,
  entering,
  exiting,
  refName = BOX_REF,
}: SizeBoxProps) {
  const ref = useTestRef(refName);
  return (
    <AnimatedSafeAreaView
      ref={ref}
      edges={NO_EDGES}
      layout={layout}
      entering={entering}
      exiting={exiting}
      collapsable={false}
      style={[
        { backgroundColor: 'teal' },
        { marginLeft: left, marginTop: top, width, height },
        style,
      ]}
    />
  );
}

/** A view with a Text inside it: case 2 of Objective 01. */
function TextChildBox(box: SizeBoxProps) {
  return (
    <SizeBox {...box}>
      <Text>Text in a box</Text>
    </SizeBox>
  );
}

// React Native puts a mask on the layer of a view that clips with a radius that is not circular on each corner.
const MASK = { overflow: 'hidden', borderTopLeftRadius: 20 } as const;
// React Native draws a border that is not uniform on a private sublayer.
const SUBLAYER = { borderLeftWidth: 4, borderColor: 'black' } as const;
// React Native draws a box shadow, an outline, and a background image on private sublayers.
const SHADOWED = {
  boxShadow: '4px 4px 6px 0px rgba(0, 0, 0, 0.8)',
  outlineWidth: 3,
  outlineColor: 'red',
  experimental_backgroundImage: 'linear-gradient(to right, red, blue)',
} as const;

/** A box in a parent that clips it with a mask. */
function MaskedParentBox(box: SizeBoxProps) {
  return (
    <View
      collapsable={false}
      style={[{ width: 300, height: PAIR_CELL_HEIGHT }, MASK]}>
      <SizeBox {...box} />
    </View>
  );
}

const ENTERING = REFERENCE_CASES['an entering animation'];
const EXITING = REFERENCE_CASES['an exiting animation'];
const LAYOUT = REFERENCE_CASES['a timing with a linear easing'];
const ROTATION = REFERENCE_CASES['a rotation'];
const REFUSED_TARGET = {
  isFrameDriven: true,
  refusedWith: 'UnsupportedTarget',
} as const;

const ENTERING_SIZE: ReferenceCase = {
  flow: 'entering',
  leaves: {
    opacity: { duration: MATRIX_DURATION, initial: 0.2, to: 1 },
    width: { duration: MATRIX_DURATION, initial: -30 },
  },
  places: [undefined, END],
  totalMs: MATRIX_DURATION,
  ...REFUSED_TARGET,
};
const EXITING_SIZE: ReferenceCase = {
  flow: 'exiting',
  leaves: {
    opacity: { duration: MATRIX_DURATION, initial: 1, to: 0.2 },
    width: { duration: MATRIX_DURATION, to: -30 },
  },
  places: [END, undefined],
  totalMs: MATRIX_DURATION,
  ...REFUSED_TARGET,
};
const LAYOUT_SIZE: ReferenceCase = {
  ...REFERENCE_CASES['a size'],
  ...REFUSED_TARGET,
};

type Box = ReferenceCase['box'];
const withBox = (referenceCase: ReferenceCase, box: Box): ReferenceCase => ({
  ...referenceCase,
  box,
});

const isEvent =
  (name: string) =>
  ({ event }: TraceEvent) =>
    event === name;

/**
 * Statements A and B and the route of the first build. A native case also has
 * the twin timeline at common times, where the platform plays moving geometry.
 * A refused case does not: its first common read is at the start call of the
 * frame driver, before a frame of it shows (measured: a new layer shows opacity
 * 1 while its model has the initial value, on both boxes; a rotation shows the
 * end transform of the style; the first display frames of D054 decision 6).
 */
async function expectCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await play(referenceCase);
  expectReference(caseName, referenceCase, played);
  const isNative = !routedCaseOf(referenceCase).isFrameDriven;
  expect(played.events.some(isEvent('Admitted'))).toBe(isNative);
  expect(played.events.some(isEvent('LayoutBuildFailed'))).toBe(!isNative);
  if (isNative && PLAYS_MOVING_GEOMETRY) {
    expectAtCommonTime(caseName, referenceCase, played);
  }
  await render(null);
  return played;
}

const routeNameOf = (referenceCase: ReferenceCase) =>
  routedCaseOf(referenceCase).isFrameDriven
    ? `is frame-driven: ${routedCaseOf(referenceCase).refusedWith}`
    : 'plays natively';

/**
 * Yoga floors the top and ceils the bottom of a Text that is off the pixel
 * grid, so a Text can lay out up to two pixels taller than its height (measured
 * on the phone at a top of `PAIR_TOP`: 50.67 for 50), out of the pixel-grid
 * check of `expectReference`. The check passes only where the absolute top of
 * each box rounds well: on the top row of the present scene it passed for both
 * boxes of each case.
 */
const onTopRowOf = (referenceCase: ReferenceCase): ReferenceCase => ({
  ...referenceCase,
  places: referenceCase.places.map((place) => place && { ...place, top: 0 }),
});

const HOSTS: [string, Box][] = [
  ['a Text', { host: 'Text' }],
  ['an Image', { host: 'Image' }],
  ['a custom native view', { Box: CustomViewBox }],
];

/** Apple plays a transform track only on a `View`, a `Text`, and an `Image`. */
const rotationOf = (box: Box): ReferenceCase =>
  box?.Box === CustomViewBox && !PLAYS_TRANSFORM_ON_EACH_COMPONENT
    ? { ...withBox(ROTATION, box), ...REFUSED_TARGET }
    : withBox(ROTATION, box);

describe('native layout matrix: components', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  for (const [hostName, box] of HOSTS) {
    const cases: [string, ReferenceCase][] = [
      ['an entering animation of opacity and X', withBox(ENTERING, box)],
      ['an entering animation with a width leaf', withBox(ENTERING_SIZE, box)],
      ['an exiting animation of opacity and X', withBox(EXITING, box)],
      ['an exiting animation with a width leaf', withBox(EXITING_SIZE, box)],
      ['a layout animation of position and opacity', withBox(LAYOUT, box)],
      ['a layout animation of the size', withBox(LAYOUT_SIZE, box)],
      ['a layout animation of a rotation', rotationOf(box)],
    ];
    for (const [caseName, declaredCase] of cases) {
      const fullName = `${caseName} of ${hostName}`;
      const referenceCase =
        box?.host === 'Text' ? onTopRowOf(declaredCase) : declaredCase;
      test(`${fullName} ${routeNameOf(referenceCase)}, and the two boxes are on the declared timeline`, async () => {
        await expectCase(fullName, referenceCase);
      });
    }
  }

  const textChild: ReferenceCase = withBox(
    REFERENCE_CASES['a position change and a size change'],
    { Box: TextChildBox }
  );
  test(`a position and size change of a view with a Text inside it ${routeNameOf(textChild)}, and the two boxes are on the declared timeline`, async () => {
    await expectCase(
      'a position and size change with a Text inside',
      textChild
    );
  });
});

describe('native layout matrix: a mask and private sublayers', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const cases: [string, ReferenceCase][] = [
    [
      'a layout animation of position and opacity of a view with a mask',
      withBox(LAYOUT, { style: MASK }),
    ],
    [
      'a layout animation of the size of a view with a mask',
      withBox(LAYOUT_SIZE, { style: MASK }),
    ],
    [
      'an entering animation of a view in a parent with a mask',
      withBox(ENTERING, { Box: MaskedParentBox }),
    ],
    [
      'a layout animation of position and opacity of a view with a border on a private sublayer',
      withBox(LAYOUT, { style: SUBLAYER }),
    ],
    [
      'a layout animation of the size of a view with a border on a private sublayer',
      withBox(LAYOUT_SIZE, { style: SUBLAYER }),
    ],
    [
      'a layout animation of position and opacity of a view with a box shadow, an outline, and a background image',
      withBox(LAYOUT, { style: SHADOWED }),
    ],
    [
      'a layout animation of the size of a view with a box shadow, an outline, and a background image',
      withBox(LAYOUT_SIZE, { style: SHADOWED }),
    ],
  ];
  for (const [caseName, referenceCase] of cases) {
    test(`${caseName} ${routeNameOf(referenceCase)}, and the two boxes are on the declared timeline`, async () => {
      await expectCase(caseName, referenceCase);
    });
  }
});

const SIZE_FIRST: Place = { left: 120, top: 0, width: 150 };
const LATE_STYLE_MS = PAIR_DURATION / 3;

/**
 * An X and width group, and at a third of it a commit of a style that React
 * Native draws from the size. Where the platform plays a size change, the route
 * gives the group to the frame driver.
 */
const lateStyleCaseOf = (
  style: SizeBoxProps['style'],
  transform?: ViewStyle['transform']
): ReferenceCase => ({
  flow: 'layout',
  leaves: {
    originX: { duration: PAIR_DURATION },
    width: { duration: PAIR_DURATION },
  },
  places: [START, SIZE_FIRST],
  totalMs: PAIR_DURATION,
  ...(PLAYS_SIZE_CHANGE ? {} : REFUSED_TARGET),
  restyle: {
    atMs: LATE_STYLE_MS,
    style,
    transform,
    handsOver: PLAYS_SIZE_CHANGE,
  },
});

/** The builds after the first: the build of the restyle commit. */
const laterBuildsOf = (events: TraceEvent[]) =>
  events.slice(events.findIndex(isEvent('Admitted')) + 1);

function expectNoWidthKeyAfter({ rows }: Played, refusal: TraceEvent) {
  const takenMs = refusal.monotonicTimeMs + FRAME_MS;
  for (const { row } of rows) {
    const { monotonicTimeMs, playbacks } = row.native.Width;
    if (monotonicTimeMs >= takenMs) {
      expect(playbacks.length).toBe(0);
    }
  }
}

describe('native layout matrix: a late style during a size track', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const lateStyles: [string, SizeBoxProps['style'], ViewStyle['transform']?][] =
    [
      ['an outline', { outlineWidth: 3, outlineColor: 'red' }],
      ['a box shadow', { boxShadow: '4px 4px 6px 0px rgba(0, 0, 0, 0.8)' }],
      [
        'a background image',
        {
          experimental_backgroundImage: 'linear-gradient(to right, red, blue)',
        },
      ],
      ['a radius that is not uniform', { borderTopLeftRadius: 12 }],
      ['a percent translation', {}, [{ translateX: '10%' }]],
    ];
  for (const [styleName, style, transform] of lateStyles) {
    test(`${styleName} that comes during a native X and width group ${PLAYS_SIZE_CHANGE ? 'gives the group to the frame driver: UnsupportedTarget' : 'keeps the frame-driven group'}, and the two boxes are on the declared timeline`, async () => {
      const referenceCase = lateStyleCaseOf(style, transform);
      const caseName = `${styleName} during a size group`;
      const played = await play(referenceCase);
      expectReference(caseName, referenceCase, played);
      if (PLAYS_SIZE_CHANGE) {
        const later = laterBuildsOf(played.events);
        const refusals = later.filter(isEvent('LayoutBuildFailed'));
        expect(summarize(refusals)).toBe('LayoutBuildFailed:UnsupportedTarget');
        expect(later.some(isEvent('Admitted'))).toBe(false);
        if (refusals.length > 0) {
          expectNoWidthKeyAfter(played, refusals[0]);
        }
      } else {
        expect(played.events.some(isEvent('Admitted'))).toBe(false);
      }
      await render(null);
    });
  }
});

describe('native layout matrix: transform cases of the D042 list', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  const SHARED_REF = 'NativeLayoutMatrixSharedSource';
  const SHARED_DURATION = PAIR_DURATION / 3;
  const SHARED = {
    sharedTag: 'native-layout-matrix',
    transition: SharedTransition.duration(SHARED_DURATION),
  };
  // React Native gives no tag in this range, and each shared container takes the next even number.
  const FIRST_SHARED_CONTAINER_TAG = 10000002;
  const SHARED_CONTAINER_TAGS = 300;
  const TRAVEL = 60;
  const ANGLE_DEG = 45;
  const sharedOperations: Operation[] = [
    ['translateX', 0, TRAVEL],
    ['rotate', '0deg', `${ANGLE_DEG}deg`],
  ];

  async function findSharedContainerTag() {
    const tags = Array.from(
      { length: SHARED_CONTAINER_TAGS },
      (_, index) => FIRST_SHARED_CONTAINER_TAG + 2 * index
    );
    const samples = await Promise.all(
      tags.map((tag) => sample(tag, 'PositionX').catch(() => undefined))
    );
    return tags.find((_, index) => samples[index] !== undefined);
  }

  function SharedSourceBox({
    left,
    layout,
  }: {
    left: number;
    layout: ReturnType<typeof layoutOf>;
  }) {
    const ref = useTestRef(SHARED_REF);
    return (
      <Animated.View
        ref={ref}
        sharedTransitionTag={SHARED.sharedTag}
        sharedTransitionStyle={SHARED.transition}
        layout={layout}
        style={{
          width: BOX_SIZE,
          height: BOX_SIZE,
          backgroundColor: 'teal',
          marginLeft: left,
          transform: [{ translateX: TRAVEL }, { rotate: `${ANGLE_DEG}deg` }],
        }}
      />
    );
  }

  const angleOf = (matrix: number[]) =>
    (Math.atan2(matrix[1], matrix[0]) * 180) / Math.PI;

  movingGeometryTest(
    'a shared transition from a view with a native transform track of a translation and a rotation starts at the transform on screen',
    async () => {
      if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
        return;
      }
      const starts: { angle: number; x: number }[] = [];
      for (const hasCallback of [false, true]) {
        const layout = layoutOf(
          {},
          {
            transform: {
              operations: sharedOperations,
              shared: { duration: PAIR_DURATION, hasCallback },
            },
          }
        );
        const screens = (left: number, showsTarget: boolean) => (
          <SharedScreens
            {...SHARED}
            showsTarget={showsTarget}
            source={<SharedSourceBox left={left} layout={layout} />}
          />
        );
        await render(screens(START_LEFT, false));
        await wait(50);
        const tag = getTestComponent(SHARED_REF).getTag();
        await render(screens(START_LEFT + 2, false));
        await wait(PAIR_DURATION / 3);
        const moving = await sample(tag, 'Transform');
        expect(moving.playbacks.length).toBe(hasCallback ? 0 : 1);
        const shown = hasCallback ? moving.model : moving.presentation;
        await render(screens(START_LEFT + 2, true));
        await wait(2 * FRAME_MS);
        const containerTag = await findSharedContainerTag();
        expect(containerTag !== undefined).toBe(true);
        const [position, transform] = await Promise.all([
          sample(containerTag!, 'PositionX'),
          sample(containerTag!, 'Transform'),
        ]);
        console.log(
          `SHARED-TRANSFORM | callback ${hasCallback} | source angle ${angleOf(shown).toFixed(3)} deg, translateX ${shown[12].toFixed(3)} | container angle ${angleOf(transform.model).toFixed(3)} deg, x ${position.model[0].toFixed(3)}, translateX ${transform.model[12].toFixed(3)}`
        );
        starts.push({
          angle: angleOf(transform.model) - angleOf(shown),
          x: position.model[0] + transform.model[12] - shown[12],
        });
        await wait(PAIR_DURATION / 2);
        await render(null);
      }
      // The container moves to the target for two display frames after its start.
      const twoFramesOfTransition = (2 * FRAME_MS) / SHARED_DURATION;
      const threeFramesOfTrack = (3 * FRAME_MS) / PAIR_DURATION;
      const angleBound =
        ANGLE_DEG * (2 * twoFramesOfTransition + threeFramesOfTrack);
      const xBound =
        2 * POSITION_TOLERANCE +
        (PAIR_LEFT + TRAVEL) * 2 * twoFramesOfTransition +
        TRAVEL * threeFramesOfTrack;
      const angleError = Math.abs(starts[0].angle - starts[1].angle);
      const xError = Math.abs(starts[0].x - starts[1].x);
      console.log(
        `MODEL-BOUND-ROW | a shared transition from a native translation and rotation | angle ${angleError.toFixed(4)} deg, bound ${angleBound.toFixed(4)} | x ${xError.toFixed(4)} pt, bound ${xBound.toFixed(4)}`
      );
      expect(angleError < angleBound).toBe(true);
      expect(xError < xBound).toBe(true);
    }
  );

  const WRITTEN = 0.6;
  const FADED = 0.2;
  function FadedWriterBox(box: SizeBoxProps) {
    return <WriterBox {...box} initialOpacity={FADED} />;
  }
  const fadedAt = (left: number, top: number): Place => ({
    left,
    top,
    opacity: FADED,
  });
  const writeInTurnOfTransfer: ReferenceCase = {
    flow: 'layout',
    leaves: {
      originX: { duration: 1600, onlyWhenChanged: true },
      originY: { isFrameDrivenSpring: true, onlyWhenChanged: true },
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
    write: {
      targets: ['Opacity'],
      run: () => {
        opacities[BOX_REF].value = WRITTEN;
        opacities[FRAME_BOX_REF].value = WRITTEN;
      },
    },
  };
  const syncState = NATIVE_ANIMATION_ROUTES.synchronousProps ? 'on' : 'off';
  movingGeometryTest(
    `an opacity write in the JS turn of the commit that gives the native tracks to the frame driver (synchronous props ${syncState}): the two boxes are on the declared timeline, and the native box ends at the model of the twin`,
    async () => {
      const caseName = `a write in the turn of a transfer, synchronous props ${syncState}`;
      const played: Played = await play(writeInTurnOfTransfer);
      expectReference(caseName, writeInTurnOfTransfer, played);
      expectNoKeyAfterTransfer(played, 'Opacity');
      const { native, frame } = played.end!;
      console.log(
        `WRITTEN-END | ${caseName} | native model ${native.Opacity.model[0]}, native presentation ${native.Opacity.presentation[0]}, twin model ${frame.Opacity.model[0]} | events ${summarize(played.events)}`
      );
      expect(native.Opacity.playbacks.length).toBe(0);
      expect(
        isNear(native.Opacity.presentation[0], frame.Opacity.model[0])
      ).toBe(true);
      await render(null);
    }
  );
});
