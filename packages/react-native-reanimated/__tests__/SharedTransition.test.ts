import { withTiming } from '../src/animation';
import { ReduceMotion } from '../src/commonTypes';
import type {
  AnimationObject,
  LayoutAnimation,
  LayoutAnimationsValues,
  StyleProps,
} from '../src/commonTypes';
import type { SharedTransitionAnimationsValues } from '../src/layoutReanimation/SharedTransition';
import {
  SharedTransition,
  SharedTransitionType,
} from '../src/layoutReanimation/SharedTransition';

jest.mock('react-native-worklets', () =>
  jest.requireActual('../../react-native-worklets/src/mock')
);

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// Rotation by 90 degrees around the z axis.
const ROTATE_90 = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function snapshot(
  prefix: 'current' | 'target',
  values: Record<string, unknown>
) {
  const result: Record<string, unknown> = {};
  for (const key in values) {
    result[prefix + key] = values[key];
  }
  return result;
}

const SOURCE = {
  OriginX: 10,
  OriginY: 20,
  GlobalOriginX: 10,
  GlobalOriginY: 20,
  Width: 100,
  Height: 50,
  Opacity: 1,
  BackgroundColor: 'rgba(255, 0, 0, 1.000000)',
  Transform: { matrix: IDENTITY },
  TransformMatrix: IDENTITY,
  TransformOrigin: [50, 25, 0],
  BorderRadius: 0,
  BorderWidth: 0,
  BorderColor: 'rgba(0, 0, 0, 0.000000)',
};

const TARGET = {
  ...SOURCE,
  OriginX: 110,
  GlobalOriginX: 110,
  Width: 300,
  BackgroundColor: 'rgba(0, 0, 255, 1.000000)',
  Transform: { matrix: ROTATE_90 },
  TransformMatrix: ROTATE_90,
  TransformOrigin: [150, 25, 0],
  BorderRadius: '50.000000%',
};

const VALUES = {
  ...snapshot('current', { ...SOURCE, BorderRadius: '0.000000%' }),
  ...snapshot('target', TARGET),
  windowWidth: 400,
  windowHeight: 800,
} as unknown as SharedTransitionAnimationsValues;

function runLayoutAnimation(transition: SharedTransition): LayoutAnimation {
  return transition.build()(VALUES as unknown as LayoutAnimationsValues);
}

function rotationOf(style: StyleProps) {
  const [{ matrix }] = style.transform as [{ matrix: number[] }];
  return (Math.atan2(matrix[1], matrix[0]) * 180) / Math.PI;
}

describe('SharedTransition', () => {
  describe('default animation', () => {
    test('animates only the properties that differ', () => {
      const { initialValues, animations } = runLayoutAnimation(
        new SharedTransition()
      );
      const changed = [
        'backgroundColor',
        'borderRadius',
        'originX',
        'transform',
        'transformOrigin',
        'width',
      ];
      expect(Object.keys(initialValues).sort()).toEqual(changed);
      expect(Object.keys(animations).sort()).toEqual(changed);
    });

    test('passes the transform as an array of matrices', () => {
      const { initialValues, animations } = runLayoutAnimation(
        new SharedTransition()
      );
      expect(initialValues.transform).toEqual([{ matrix: IDENTITY }]);
      expect(animations.transform).toHaveLength(1);
      expect(animations.transform[0]).toHaveProperty('matrix');
    });
  });

  describe('custom animation', () => {
    test('maps a transformMatrix result to transform', () => {
      const { animations } = runLayoutAnimation(
        SharedTransition.custom((values) => {
          'worklet';
          return {
            width: values.targetWidth,
            transformMatrix: values.targetTransformMatrix,
          };
        })
      );
      expect(animations).toEqual({
        width: 300,
        transform: [{ matrix: ROTATE_90 }],
      });
    });

    test('starts from the changed source values', () => {
      const { initialValues } = runLayoutAnimation(
        SharedTransition.custom(() => {
          'worklet';
          return {};
        })
      );
      expect(initialValues.originX).toBe(10);
      expect(initialValues.width).toBe(100);
      expect(initialValues).not.toHaveProperty('height');
      expect(initialValues).not.toHaveProperty('globalOriginX');
      expect(initialValues).not.toHaveProperty('transformMatrix');
    });

    test('starts the animated unchanged values from the source', () => {
      const { initialValues } = runLayoutAnimation(
        SharedTransition.custom((values) => {
          'worklet';
          return { height: values.targetHeight };
        })
      );
      expect(initialValues.height).toBe(50);
    });

    test('starts a border corner and side that no view sets from the shorthand', () => {
      const { initialValues } = runLayoutAnimation(
        SharedTransition.custom(() => {
          'worklet';
          return {
            borderTopLeftRadius: withTiming(30),
            borderLeftWidth: withTiming(2),
            borderTopColor: withTiming('red'),
          };
        })
      );
      expect(initialValues.borderTopLeftRadius).toBe('0.000000%');
      expect(initialValues.borderLeftWidth).toBe(0);
      expect(initialValues.borderTopColor).toBe('rgba(0, 0, 0, 0.000000)');
    });

    test('applies the reduce motion of the builder', () => {
      const matrix = withTiming(IDENTITY);
      const { animations } = runLayoutAnimation(
        SharedTransition.custom(() => {
          'worklet';
          return { transform: [{ matrix }] };
        }).reduceMotion(ReduceMotion.Always)
      );
      expect(animations.transform[0].matrix.reduceMotion).toBe(true);
    });

    test('starts an animation defined outside the worklet', () => {
      const width = () => ({ onFrame: () => true, onStart: () => undefined });
      const { animations } = runLayoutAnimation(
        SharedTransition.custom(() => {
          'worklet';
          return { width };
        }).reduceMotion(ReduceMotion.Always)
      );
      expect(animations.width.reduceMotion).toBe(true);
    });
  });

  describe('default progress animation', () => {
    const progressAnimation = new SharedTransition().getProgressAnimation();

    test('starts at the source and ends at the target', () => {
      const start = progressAnimation(VALUES, 0);
      const end = progressAnimation(VALUES, 1);
      expect(start.width).toBe(100);
      expect(end.width).toBe(300);
      expect(start.originX).toBe(10);
      expect(end.originX).toBe(110);
      expect(rotationOf(start)).toBeCloseTo(0);
      expect(rotationOf(end)).toBeCloseTo(90);
    });

    test('interpolates numbers, colors, percentages and transforms', () => {
      const middle = progressAnimation(VALUES, 0.5);
      expect(middle.width).toBe(200);
      expect(middle.transformOrigin).toEqual([100, 25, 0]);
      expect(middle.borderRadius).toBe('25%');
      expect(middle.backgroundColor).toEqual(expect.any(Number));
      expect(middle.backgroundColor).not.toBe(
        progressAnimation(VALUES, 0).backgroundColor
      );
      expect(rotationOf(middle)).toBeCloseTo(45);
    });

    test('processes the shadow colors', () => {
      const shadow = {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: 0,
        color: 'red',
      };
      const [{ color }] = SharedTransition.progressAnimation(() => {
        'worklet';
        return { boxShadow: [shadow] };
      }).getProgressAnimation()(VALUES, 0.5).boxShadow;
      expect(color).toEqual(expect.any(Number));
      expect(shadow.color).toBe('red');
    });

    test('leaves out the properties that do not change', () => {
      const middle = progressAnimation(VALUES, 0.5);
      expect(middle).not.toHaveProperty('height');
      expect(middle).not.toHaveProperty('opacity');
      expect(middle).not.toHaveProperty('transformMatrix');
    });

    test('is replaced by a custom progress animation', () => {
      const custom = () => {
        'worklet';
        return { opacity: 0.5 };
      };
      expect(
        SharedTransition.progressAnimation(custom).getProgressAnimation()(
          VALUES,
          0.5
        )
      ).toEqual({ opacity: 0.5 });
    });

    test('maps a custom transformMatrix to a transform', () => {
      const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1];
      const custom = () => {
        'worklet';
        return { transformMatrix: matrix };
      };
      expect(
        SharedTransition.progressAnimation(custom).getProgressAnimation()(
          VALUES,
          0.5
        )
      ).toEqual({ transform: [{ matrix }] });
    });
  });

  describe('PROGRESS_ANIMATION', () => {
    const transition = SharedTransition.progressAnimation(
      (values, progress) => {
        'worklet';
        return {
          width:
            values.currentWidth +
            progress * (values.targetWidth - values.currentWidth),
          transformMatrix: values.targetTransformMatrix,
        };
      }
    )
      .duration(100)
      .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION);

    test('evaluates the progress animation at 0 first', () => {
      const progresses: number[] = [];
      runLayoutAnimation(
        SharedTransition.progressAnimation((_values, progress) => {
          'worklet';
          progresses.push(progress);
          return { opacity: progress };
        }).defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION)
      );
      expect(progresses).toEqual([0]);
    });

    test('starts with the progress animation at 0', () => {
      const { initialValues } = runLayoutAnimation(transition);
      expect(initialValues).toEqual({
        width: 100,
        transform: [{ matrix: ROTATE_90 }],
      });
    });

    test('drives the progress animation to 1', () => {
      const { animations } = runLayoutAnimation(transition);
      const definition = animations.width as
        | AnimationObject
        | (() => AnimationObject);
      const width =
        typeof definition === 'function' ? definition() : definition;
      width.onStart(width, 0, 0, undefined!);
      expect(width.current).toBe(100);
      let finished = false;
      for (let timestamp = 16; !finished && timestamp < 1000; timestamp += 16) {
        finished = width.onFrame(width, timestamp);
      }
      expect(finished).toBe(true);
      expect(width.current).toBe(300);
      expect(Object.keys(animations).sort()).toEqual(['transform', 'width']);
    });
  });
});

describe('SharedTransition with fadeContent', () => {
  const FADING_VALUES = {
    ...VALUES,
    currentContentOpacity: 1,
    targetContentOpacity: 0,
  } as unknown as SharedTransitionAnimationsValues;
  const fadingLayoutValues = FADING_VALUES as unknown as LayoutAnimationsValues;

  test('fades the content out when a custom animation leaves it out', () => {
    const { initialValues, animations } = SharedTransition.custom((values) => {
      'worklet';
      return { width: withTiming(values.targetWidth) };
    })
      .fadeContent()
      .build()(fadingLayoutValues);
    expect(initialValues.contentOpacity).toBe(1);
    expect(animations).toHaveProperty('contentOpacity');
  });

  test('keeps the content opacity animation of a custom animation', () => {
    const contentOpacity = withTiming(0.5);
    const { animations } = SharedTransition.custom(() => {
      'worklet';
      return { contentOpacity };
    })
      .fadeContent()
      .build()(fadingLayoutValues);
    expect(animations.contentOpacity.toValue).toBe(0.5);
  });

  test('interpolates the content opacity of a custom progress animation', () => {
    const style = SharedTransition.progressAnimation(() => {
      'worklet';
      return { opacity: 0.5 };
    }).getProgressAnimation()(FADING_VALUES, 0.25);
    expect(style).toEqual({ opacity: 0.5, contentOpacity: 0.75 });
  });

  test('drives the content opacity in PROGRESS_ANIMATION', () => {
    const { initialValues, animations } = SharedTransition.progressAnimation(
      () => {
        'worklet';
        return { opacity: 0.5 };
      }
    )
      .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION)
      .build()(fadingLayoutValues);
    expect(initialValues.contentOpacity).toBe(1);
    expect(Object.keys(animations).sort()).toEqual([
      'contentOpacity',
      'opacity',
    ]);
  });
});

describe('SharedTransition with a clip', () => {
  const CLIPPED_VALUES = {
    ...VALUES,
    currentClipOriginX: 0,
    targetClipOriginX: 40,
    currentClipWidth: 100,
    targetClipWidth: 200,
  } as unknown as SharedTransitionAnimationsValues;
  const clippedLayoutValues =
    CLIPPED_VALUES as unknown as LayoutAnimationsValues;

  test('moves the clip when a custom animation leaves it out', () => {
    const { initialValues, animations } = SharedTransition.custom((values) => {
      'worklet';
      return { width: withTiming(values.targetWidth) };
    }).build()(clippedLayoutValues);
    expect(initialValues.clipOriginX).toBe(0);
    expect(animations).toHaveProperty('clipOriginX');
    expect(animations).toHaveProperty('clipWidth');
  });

  test('keeps the clip animation of a custom animation', () => {
    const clipWidth = withTiming(150);
    const { animations } = SharedTransition.custom(() => {
      'worklet';
      return { clipWidth };
    }).build()(clippedLayoutValues);
    expect(animations.clipWidth.toValue).toBe(150);
  });

  test('interpolates the clip of a custom progress animation', () => {
    const style = SharedTransition.progressAnimation(() => {
      'worklet';
      return { opacity: 0.5 };
    }).getProgressAnimation()(CLIPPED_VALUES, 0.25);
    expect(style).toEqual({ opacity: 0.5, clipOriginX: 10, clipWidth: 125 });
  });
});

describe('SharedTransition singular matrices', () => {
  const collapsed = IDENTITY.map((value, i) =>
    i === 0 || i === 5 ? 0 : value
  );
  test.each([
    [IDENTITY, collapsed],
    [collapsed, IDENTITY],
  ])('progress interpolates a zero scale %#', (from, to) => {
    const values = {
      ...VALUES,
      currentTransform: { matrix: from },
      targetTransform: { matrix: to },
    };
    for (const progress of [0, 0.5, 1]) {
      const style = new SharedTransition().getProgressAnimation()(
        values,
        progress
      );
      const [{ matrix }] = style.transform as [{ matrix: number[] }];
      matrix.forEach((value, i) =>
        expect(value).toBeCloseTo(from[i] + progress * (to[i] - from[i]), 10)
      );
    }
  });
});

describe('SharedTransition perspective', () => {
  test('preserves perspective at intermediate progress and at the target', () => {
    const target = IDENTITY.map((value, i) =>
      i === 3 || i === 7 || i === 11 ? -0.002 : value
    );
    const values = {
      ...VALUES,
      currentTransform: { matrix: IDENTITY },
      targetTransform: { matrix: target },
    };
    for (const progress of [0, 0.25, 0.5, 1]) {
      const style = new SharedTransition().getProgressAnimation()(
        values,
        progress
      );
      const [{ matrix }] = style.transform as [{ matrix: number[] }];
      for (const i of [3, 7, 11]) {
        expect(matrix[i]).toBeCloseTo(-0.002 * progress, 10);
      }
    }
  });
});
