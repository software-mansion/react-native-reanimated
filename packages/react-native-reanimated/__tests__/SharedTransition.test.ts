import { withSpring, withStyleAnimation, withTiming } from '../src/animation';
import { ReduceMotion } from '../src/commonTypes';
import type {
  AnimationObject,
  LayoutAnimation,
  LayoutAnimationsValues,
  StyleProps,
} from '../src/commonTypes';
import { Easing } from '../src/Easing';
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
    test('keeps geometry active when an endpoint can change', () => {
      const { initialValues, animations } = runLayoutAnimation(
        new SharedTransition()
      );
      const changed = [
        'backgroundColor',
        'borderRadius',
        'height',
        'originX',
        'originY',
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

describe('SharedTransition target updates', () => {
  const originalTimestamp = global.__frameTimestamp;

  afterEach(() => {
    global.__frameTimestamp = originalTimestamp;
  });

  test('changes width without a jump and keeps the timing deadline', () => {
    const run = startTransition(
      SharedTransition.duration(1000).easing(Easing.linear)
    );
    run.frame(700);
    const width = run.animation.current.width;
    run.style.updateTarget!({ targetWidth: 500 });
    run.frame(700);
    expect(run.animation.current.width).toBe(width);
    expect(run.frame(1000)).toBe(true);
    expect(run.animation.current.width).toBe(500);
  });

  test('finishes while the target transform keeps moving', () => {
    const run = startTransition(
      SharedTransition.duration(1000).easing(Easing.linear)
    );
    for (let time = 100; time < 1000; time += 100) {
      run.frame(time);
      const matrix = [...IDENTITY];
      matrix[13] = time;
      run.style.updateTarget!({ targetTransform: { matrix } } as never);
    }
    expect(run.frame(1000)).toBe(true);
    expect(run.animation.current.transform).toEqual([
      { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 900, 0, 1] },
    ]);
  });

  test('restores a transform that was equal at the start', () => {
    const run = startTransition(SharedTransition.duration(1000), {
      targetTransform: { matrix: IDENTITY },
    });
    run.frame(250);
    run.style.updateTarget!({
      targetTransform: { matrix: ROTATE_90 },
    } as never);
    run.frame(500);
    expect(rotationOf(run.animation.current)).toBeGreaterThan(0);
    run.style.updateTarget!({ targetTransform: { matrix: IDENTITY } } as never);
    expect(run.frame(1000)).toBe(true);
    expect(rotationOf(run.animation.current)).toBeCloseTo(0);
  });

  test('revives a finished scalar while the transform still runs', () => {
    const run = startTransition(
      SharedTransition.springify().damping(15).mass(1).stiffness(100),
      { currentWidth: 100, targetWidth: 100 }
    );
    run.frame(16);
    run.frame(100);
    run.style.updateTarget!({ targetWidth: 200 });
    run.frame(132);
    expect(run.animation.current.width).toBeGreaterThan(100);
    run.style.updateTarget!({ targetWidth: 100 });
    let finished = false;
    for (let time = 148; !finished && time < 5000; time += 16) {
      finished = run.frame(time);
    }
    expect(finished).toBe(true);
    expect(run.animation.current.width).toBe(100);
  });

  const springCases = [
    {
      name: 'physics',
      config: { damping: 15, mass: 1, stiffness: 100 },
      builder: () =>
        SharedTransition.springify().damping(15).mass(1).stiffness(100),
    },
    {
      name: 'duration',
      config: { duration: 600, dampingRatio: 0.85 },
      builder: () => SharedTransition.springify(600).dampingRatio(0.85),
    },
    {
      name: 'clamped',
      config: { damping: 15, mass: 1, stiffness: 100, overshootClamping: true },
      builder: () =>
        SharedTransition.springify()
          .damping(15)
          .mass(1)
          .stiffness(100)
          .overshootClamping(true),
    },
  ];

  describe.each(springCases)('$name spring', ({ config, builder }) => {
    test.each([-1000, -0.001, 0.001, 1000])(
      'keeps scalar frames and completion for a target of %s',
      (target) => {
        const style = builder().build()({
          ...VALUES,
          currentOriginX: 0,
          targetOriginX: target,
        } as never);
        const scalar = resolveAnimation(style.animations.originX);
        const expected = resolveAnimation(withSpring(target, config));
        scalar.onStart(scalar, 0, 0, undefined!);
        expected.onStart(expected, 0, 0, undefined!);
        for (let time = 16; time < 5000; time += 16) {
          const actualFinished = scalar.onFrame(scalar, time);
          const expectedFinished = expected.onFrame(expected, time);
          expect(scalar.current).toBeCloseTo(expected.current as number, 8);
          expect(actualFinished).toBe(expectedFinished);
          if (expectedFinished) {
            return;
          }
        }
        throw new Error('[Reanimated] The spring did not finish.');
      }
    );

    test('keeps matrix frames and completion', () => {
      const style = runLayoutAnimation(builder());
      const actual = resolveAnimation(style.animations.transform[0].matrix);
      const expected = resolveAnimation(withSpring(ROTATE_90, config));
      actual.onStart(actual, IDENTITY, 0, undefined!);
      expected.onStart(expected, IDENTITY, 0, undefined!);
      for (let time = 16; time < 5000; time += 16) {
        const actualFinished = actual.onFrame(actual, time);
        const expectedFinished = expected.onFrame(expected, time);
        (actual.current as number[]).forEach((value, index) => {
          expect(value).toBeCloseTo((expected.current as number[])[index], 8);
        });
        expect(actualFinished).toBe(expectedFinished);
        if (expectedFinished) {
          return;
        }
      }
      throw new Error('[Reanimated] The matrix spring did not finish.');
    });
  });

  test('keeps spring position and velocity when its target changes', () => {
    const animation = resolveAnimation(
      withSpring(100, { damping: 15, stiffness: 100, mass: 1 })
    );
    animation.onStart(animation, 0, 0, undefined!);
    for (let time = 16; time <= 160; time += 16) {
      animation.onFrame(animation, time);
    }
    const current = animation.current;
    const velocity = animation.velocity;
    const omega0 = animation.omega0;
    animation.onTargetChange(animation, -100, 160);
    expect(animation.current).toBe(current);
    expect(animation.velocity).toBe(velocity);
    expect(animation.omega0).toBe(omega0);
    expect(animation.toValue).toBe(-100);
    expect(animation.initialEnergy).toBeGreaterThan(0);
  });

  test('keeps placement live after its driver finishes', () => {
    const run = startTransition(
      SharedTransition.springify(200).dampingRatio(0.85)
    );
    const transform = resolveAnimation(
      run.style.animations.transform[0].matrix
    );
    for (let time = 16; time < 3000; time += 16) {
      const finished = run.frame(time);
      if (time === 128) {
        run.style.updateTarget!({ targetWidth: 1000 });
      }
      if (transform.finished && !finished) {
        const matrix = [...IDENTITY];
        matrix[12] = 100;
        run.style.updateTarget!({ targetTransform: { matrix } } as never);
        run.frame(time + 16);
        expect(run.animation.current.transform).toEqual([{ matrix }]);
        return;
      }
    }
    throw new Error(
      '[Reanimated] The scalar did not outlast the placement driver.'
    );
  });

  test('does not clamp a reversing spring before it crosses the target', () => {
    const animation = resolveAnimation(
      withSpring(100, {
        damping: 15,
        stiffness: 100,
        mass: 1,
        overshootClamping: true,
      })
    );
    animation.onStart(animation, 0, 0, undefined!);
    for (let time = 16; time <= 160; time += 16) {
      animation.onFrame(animation, time);
    }
    const current = animation.current as number;
    expect(animation.velocity).toBeGreaterThan(0);
    animation.onTargetChange(animation, -100, 160);
    expect(animation.onFrame(animation, 176)).toBe(false);
    expect(animation.current).toBeGreaterThan(current);
    for (let time = 192; time < 5000; time += 16) {
      if (animation.onFrame(animation, time)) {
        expect(animation.current).toBe(-100);
        return;
      }
    }
    throw new Error('[Reanimated] The reversing spring did not finish.');
  });

  test('calibrates an initially equal duration spring when it starts moving', () => {
    const config = { duration: 600, dampingRatio: 0.85 };
    const run = startTransition(
      SharedTransition.springify(config.duration).dampingRatio(
        config.dampingRatio
      ),
      {
        currentWidth: 100,
        targetWidth: 100,
      }
    );
    run.frame(16);
    run.frame(100);
    run.style.updateTarget!({ targetWidth: 200 });
    const expected = resolveAnimation(withSpring(200, config));
    expected.onStart(expected, 100, 100, undefined!);
    for (let time = 116; time < 5000; time += 16) {
      run.frame(time);
      const finished = expected.onFrame(expected, time);
      expect(run.animation.current.width).toBeCloseTo(
        expected.current as number,
        8
      );
      if (finished) {
        expect(run.animation.current.width).toBe(200);
        return;
      }
    }
    throw new Error('[Reanimated] The duration spring did not finish.');
  });

  test('keeps default progress geometry when it changes back to the source', () => {
    const run = startTransition(
      SharedTransition.defaultTransitionType(
        SharedTransitionType.PROGRESS_ANIMATION
      )
        .duration(1000)
        .easing(Easing.linear),
      { targetWidth: 100, targetTransform: { matrix: IDENTITY } }
    );
    run.frame(250);
    run.style.updateTarget!({
      targetWidth: 500,
      targetTransform: { matrix: ROTATE_90 },
    } as never);
    run.frame(500);
    expect(run.animation.current.width).toBe(300);
    expect(rotationOf(run.animation.current)).toBeCloseTo(45);
    run.style.updateTarget!({
      targetWidth: 100,
      targetTransform: { matrix: IDENTITY },
    } as never);
    run.frame(750);
    expect(run.animation.current.width).toBe(100);
    expect(rotationOf(run.animation.current)).toBeCloseTo(0);
    expect(run.frame(1000)).toBe(true);
  });

  test('does not restart the color or content fade', () => {
    const values = { currentContentOpacity: 1, targetContentOpacity: 0 };
    const baseline = startTransition(
      SharedTransition.duration(1000).fadeContent(),
      values
    );
    const moving = startTransition(
      SharedTransition.duration(1000).fadeContent(),
      values
    );
    for (let time = 100; time <= 1000; time += 100) {
      baseline.frame(time);
      moving.frame(time);
      expect(moving.animation.current.backgroundColor).toEqual(
        baseline.animation.current.backgroundColor
      );
      expect(moving.animation.current.contentOpacity).toBe(
        baseline.animation.current.contentOpacity
      );
      if (time < 1000) {
        moving.style.updateTarget!({ targetWidth: 300 + time });
      }
    }
  });

  test('updates progress values and aliases without changing the source', () => {
    const transition = SharedTransition.progressAnimation(
      (values, progress) => ({
        width:
          values.currentWidth +
          progress * (values.targetWidth - values.currentWidth),
        originX:
          values.currentGlobalOriginX +
          progress * (values.targetGlobalOriginX - values.currentGlobalOriginX),
        transformMatrix: values.targetTransformMatrix,
      })
    )
      .defaultTransitionType(SharedTransitionType.PROGRESS_ANIMATION)
      .duration(1000)
      .easing(Easing.linear);
    const run = startTransition(transition);
    run.frame(250);
    run.style.updateTarget!({
      currentWidth: 999,
      targetWidth: 500,
      targetGlobalOriginX: 210,
      targetTransformMatrix: IDENTITY,
    } as never);
    run.frame(250);
    expect(run.animation.current.width).toBe(200);
    run.frame(500);
    expect(run.animation.current.width).toBe(300);
    expect(run.animation.current.originX).toBe(110);
    expect(run.animation.current.transform).toEqual([{ matrix: IDENTITY }]);
    expect(run.frame(1000)).toBe(true);
  });

  test('keeps the delay when the target changes before it starts', () => {
    const run = startTransition(
      SharedTransition.duration(1000).delay(200).easing(Easing.linear)
    );
    run.frame(100);
    run.style.updateTarget!({ targetWidth: 500 });
    run.frame(150);
    expect(run.animation.current.width).toBe(100);
    run.frame(200);
    expect(run.frame(1200)).toBe(true);
    expect(run.animation.current.width).toBe(500);
  });

  test('applies reduced motion to scalar and transform geometry', () => {
    const run = startTransition(
      SharedTransition.duration(1000).reduceMotion(ReduceMotion.Always)
    );
    expect(run.frame(0)).toBe(true);
    expect(run.animation.current.width).toBe(300);
    expect(rotationOf(run.animation.current)).toBeCloseTo(90);
  });
});

function startTransition(
  transition: SharedTransition,
  values: Record<string, unknown> = {}
) {
  const style = transition.build()({ ...VALUES, ...values } as never);
  const animation = withStyleAnimation(style.animations);
  animation.onStart(animation, style.initialValues, 0, undefined!);
  return {
    style,
    animation,
    frame(timestamp: number) {
      global.__frameTimestamp = timestamp;
      return animation.onFrame(animation, timestamp);
    },
  };
}

function resolveAnimation(value: unknown): AnimationObject {
  return typeof value === 'function' ? value() : (value as AnimationObject);
}
