'use strict';
import { defineAnimation } from '../animation';
import type { AffineMatrixFlat } from '../animation/transformationMatrix/matrixUtils';
import {
  interpolateMatrix,
  prepareMatrixInterpolation,
} from '../animation/transformationMatrix/matrixUtils';
import { processBoxShadow, processColorsInProps } from '../common';
import type {
  Animation,
  AnimationObject,
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
  StyleProps,
  Timestamp,
} from '../commonTypes';
import { interpolateColor } from '../interpolateColor';
import type { BaseAnimationBuilder } from './animationBuilder';
import { ComplexAnimationBuilder } from './animationBuilder';

/**
 * Used to configure the `.defaultTransitionType()` shared transition modifier.
 *
 * @experimental
 */
export enum SharedTransitionType {
  /**
   * Use the regular or custom animation, except during iOS back navigation.
   * During iOS back navigation, use the progress animation controlled by the
   * screen transition.
   */
  ANIMATION = 'animation',
  /**
   * Always use the progress animation. During iOS back navigation, the screen
   * transition controls progress. Otherwise, the builder settings, such as
   * `.duration()` or `.springify()`, control progress.
   */
  PROGRESS_ANIMATION = 'progressAnimation',
}

type BoxShadowValue = {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  spreadDistance: number;
  color: string;
};

type SharedTransitionSnapshotValues = {
  OriginX: number;
  OriginY: number;
  /** The same as `OriginX`; the transition runs in window coordinates. */
  GlobalOriginX: number;
  /** The same as `OriginY`; the transition runs in window coordinates. */
  GlobalOriginY: number;
  Width: number;
  Height: number;
  Opacity: number;
  BackgroundColor: string;
  Transform: { matrix: number[] };
  /**
   * @deprecated Reanimated 3 compatibility. A flat 16-element column-major 4×4
   *   matrix. Read `Transform.matrix` instead.
   */
  TransformMatrix: number[];
  TransformOrigin: [number, number, number];
  BorderRadius: number | string;
  BorderTopLeftRadius?: number | string;
  BorderTopRightRadius?: number | string;
  BorderBottomLeftRadius?: number | string;
  BorderBottomRightRadius?: number | string;
  BorderTopStartRadius?: number | string;
  BorderTopEndRadius?: number | string;
  BorderBottomStartRadius?: number | string;
  BorderBottomEndRadius?: number | string;
  BorderStartStartRadius?: number | string;
  BorderStartEndRadius?: number | string;
  BorderEndStartRadius?: number | string;
  BorderEndEndRadius?: number | string;
  BorderWidth: number;
  BorderLeftWidth?: number;
  BorderRightWidth?: number;
  BorderTopWidth?: number;
  BorderBottomWidth?: number;
  BorderColor: string;
  BorderLeftColor?: string;
  BorderRightColor?: string;
  BorderTopColor?: string;
  BorderBottomColor?: string;
  BoxShadow: BoxShadowValue[];
  ShadowColor: string;
  ShadowOffset: { width: number; height: number };
  ShadowOpacity: number;
  ShadowRadius: number;
  /** Android only. */
  Elevation?: number;
};

/**
 * Values passed to shared transition animation worklets: the snapshot of the
 * source view (`current*`), the snapshot of the target view (`target*`) and the
 * window size. Per-side and per-corner border values are present only when one
 * of the views sets them.
 */
export type SharedTransitionAnimationsValues = {
  [K in keyof SharedTransitionSnapshotValues as `current${K}`]: SharedTransitionSnapshotValues[K];
} & {
  [K in keyof SharedTransitionSnapshotValues as `target${K}`]: SharedTransitionSnapshotValues[K];
} & {
  windowWidth: number;
  windowHeight: number;
};

interface SharedTransitionAnimations extends StyleProps {
  transform?: [{ matrix: number[] }];
  transformMatrix?: number[];
}

/**
 * A function that defines a custom shared transition animation. It receives the
 * source/target values and should return an object containing animations for
 * each property.
 */
export type CustomSharedTransitionAnimation = (
  values: SharedTransitionAnimationsValues
) => SharedTransitionAnimations;

/**
 * A function that defines a progress-based shared transition animation. It
 * receives the source/target values along with the progress (0-1) and should
 * return the interpolated style values.
 */
export type ProgressSharedTransitionAnimation = (
  values: SharedTransitionAnimationsValues,
  progress: number
) => StyleProps;

type ChangedStyle = { key: string; current: unknown; target: unknown };

// `globalOrigin*` and `transformMatrix` repeat `origin*` and `transform`.
const ALIAS_NAMES = ['GlobalOriginX', 'GlobalOriginY', 'TransformMatrix'];

function isEqual(a: unknown, b: unknown): boolean {
  'worklet';
  if (a === b) {
    return true;
  }
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const keys = Object.keys(aRecord);
  return (
    keys.length === Object.keys(bRecord).length &&
    keys.every((key) => isEqual(aRecord[key], bRecord[key]))
  );
}

function getChangedStyles(
  values: SharedTransitionAnimationsValues
): ChangedStyle[] {
  'worklet';
  const record = values as unknown as Record<string, unknown>;
  const changed: ChangedStyle[] = [];
  for (const currentKey in record) {
    if (!currentKey.startsWith('current')) {
      continue;
    }
    const name = currentKey.slice('current'.length);
    const current = record[currentKey];
    const target = record['target' + name];
    if (ALIAS_NAMES.includes(name) || isEqual(current, target)) {
      continue;
    }
    changed.push({
      key: name[0].toLowerCase() + name.slice(1),
      current,
      target,
    });
  }
  return changed;
}

function interpolateValue(
  progress: number,
  current: unknown,
  target: unknown
): unknown {
  'worklet';
  if (typeof current === 'number' && typeof target === 'number') {
    return current + progress * (target - current);
  }
  if (typeof current === 'string' && typeof target === 'string') {
    if (current.endsWith('%') && target.endsWith('%')) {
      const from = parseFloat(current);
      return `${from + progress * (parseFloat(target) - from)}%`;
    }
    return interpolateColor(progress, [0, 1], [current, target]);
  }
  if (Array.isArray(current) && Array.isArray(target)) {
    return current.map((item, index) =>
      interpolateValue(progress, item, target[index])
    );
  }
  if (
    typeof current === 'object' &&
    typeof target === 'object' &&
    current !== null &&
    target !== null
  ) {
    const currentRecord = current as Record<string, unknown>;
    const targetRecord = target as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key in currentRecord) {
      result[key] = interpolateValue(
        progress,
        currentRecord[key],
        targetRecord[key]
      );
    }
    return result;
  }
  return progress < 1 ? current : target;
}

function defaultProgressAnimation(
  values: SharedTransitionAnimationsValues,
  progress: number
): StyleProps {
  'worklet';
  const style: Record<string, unknown> = {};
  for (const { key, current, target } of getChangedStyles(values)) {
    if (key === 'transform') {
      const matrix = interpolateMatrix(
        progress,
        prepareMatrixInterpolation(
          (current as { matrix: AffineMatrixFlat }).matrix,
          (target as { matrix: AffineMatrixFlat }).matrix
        )
      );
      style.transform = [{ matrix }];
    } else {
      style[key] = interpolateValue(progress, current, target);
    }
  }
  return style;
}

// Reanimated 3 animated `transformMatrix`, which Fabric does not read.
function withTransformMatrixAsTransform(style: StyleProps): StyleProps {
  'worklet';
  if (style.transformMatrix === undefined) {
    return style;
  }
  const { transformMatrix, ...rest } = style;
  return { ...rest, transform: [{ matrix: transformMatrix }] };
}

function withProcessedBoxShadow(style: StyleProps): StyleProps {
  'worklet';
  if (style.boxShadow === undefined) {
    return style;
  }
  const processed: Record<string, unknown> = { ...style };
  processed.boxShadow = processBoxShadow(style.boxShadow);
  return processed;
}

function getInitialStyle(
  styles: Pick<ChangedStyle, 'key' | 'current'>[]
): StyleProps {
  'worklet';
  const initialValues: Record<string, unknown> = {};
  for (const { key, current } of styles) {
    initialValues[key] = key === 'transform' ? [current] : current;
  }
  return initialValues;
}

function getCustomInitialStyle(
  values: SharedTransitionAnimationsValues,
  animations: StyleProps
): StyleProps {
  'worklet';
  const record = values as unknown as Record<string, unknown>;
  const styles: Pick<ChangedStyle, 'key' | 'current'>[] =
    getChangedStyles(values);
  for (const key in animations) {
    const current = record['current' + key[0].toUpperCase() + key.slice(1)];
    if (current !== undefined && !styles.some((style) => style.key === key)) {
      styles.push({ key, current });
    }
  }
  return getInitialStyle(styles);
}

function mapAnimations(
  value: unknown,
  mapAnimation: (animation: AnimationObject) => AnimationObject
): unknown {
  'worklet';
  // An animation created on the React Native runtime arrives as its definition.
  if (typeof value === 'function') {
    return mapAnimation((value as () => AnimationObject)());
  }
  if (Array.isArray(value)) {
    return value.map((item) => mapAnimations(item, mapAnimation));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if ('onFrame' in value) {
    return mapAnimation(value as AnimationObject);
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key in record) {
    result[key] = mapAnimations(record[key], mapAnimation);
  }
  return result;
}

function progressDrivenAnimations(
  values: SharedTransitionAnimationsValues,
  initialStyle: StyleProps,
  progressAnimation: ProgressSharedTransitionAnimation,
  createDriver: () => AnimationObject
): StyleProps {
  'worklet';
  const frame = { timestamp: -1, style: initialStyle };
  const styleAt = (timestamp: Timestamp, progress: number) => {
    if (frame.timestamp !== timestamp) {
      frame.timestamp = timestamp;
      frame.style = progressAnimation(values, progress);
    }
    return frame.style;
  };
  const animations: Record<string, unknown> = {};
  for (const key in initialStyle) {
    animations[key] = defineAnimation(0, () => {
      'worklet';
      const driver = createDriver() as Animation<AnimationObject>;
      return {
        isHigherOrder: true,
        onStart: (
          animation: Animation<AnimationObject>,
          _value: unknown,
          timestamp: Timestamp
        ) => {
          driver.onStart(driver, 0, timestamp, undefined!);
          animation.current = initialStyle[key];
        },
        onFrame: (
          animation: Animation<AnimationObject>,
          timestamp: Timestamp
        ) => {
          const finished = driver.onFrame(driver, timestamp);
          animation.current = styleAt(timestamp, driver.current as number)[key];
          return finished;
        },
        current: initialStyle[key],
      } as unknown as AnimationObject;
    });
  }
  return animations;
}

export class SharedTransition
  extends ComplexAnimationBuilder
  implements ILayoutAnimationBuilder
{
  static presetName = 'SharedTransition';

  private customAnimationFactory?: CustomSharedTransitionAnimation;
  private progressAnimationFactory?: ProgressSharedTransitionAnimation;
  private transitionType: SharedTransitionType = SharedTransitionType.ANIMATION;

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SharedTransition() as InstanceType<T>;
  }

  /**
   * Creates a shared transition with a custom animation worklet. The worklet
   * receives the source and target values and returns the animations for each
   * property.
   */
  static custom(
    customAnimationFactory: CustomSharedTransitionAnimation
  ): SharedTransition {
    const instance = new SharedTransition();
    instance.customAnimationFactory = customAnimationFactory;
    return instance;
  }

  /**
   * Creates a shared transition with a progress-based animation worklet. See
   * {@link SharedTransition#progressAnimation}.
   */
  static progressAnimation(
    progressAnimationFactory: ProgressSharedTransitionAnimation
  ): SharedTransition {
    return new SharedTransition().progressAnimation(progressAnimationFactory);
  }

  /**
   * Creates a shared transition with the given default transition type. See
   * {@link SharedTransition#defaultTransitionType}.
   */
  static defaultTransitionType(
    transitionType: SharedTransitionType
  ): SharedTransition {
    return new SharedTransition().defaultTransitionType(transitionType);
  }

  /**
   * Defines a progress-based animation for the shared transition. The worklet
   * receives the source and target values along with the progress (0-1) and
   * returns the interpolated style values. Without it, every property is
   * interpolated linearly.
   */
  progressAnimation(
    progressAnimationFactory: ProgressSharedTransitionAnimation
  ): this {
    this.progressAnimationFactory = progressAnimationFactory;
    return this;
  }

  /**
   * Sets the default transition type for the shared transition.
   *
   * - `SharedTransitionType.ANIMATION` - Uses the regular or custom animation,
   *   except during iOS back navigation, when the screen transition controls
   *   the progress animation.
   * - `SharedTransitionType.PROGRESS_ANIMATION` - Uses the progress animation for
   *   all transitions. The screen transition controls progress during iOS back
   *   navigation; otherwise, the builder settings control progress.
   *
   * @param transitionType - The transition type to use.
   */
  defaultTransitionType(transitionType: SharedTransitionType): this {
    this.transitionType = transitionType;
    return this;
  }

  build = (): LayoutAnimationFunction => {
    const delayFunction = this.getDelayFunction();
    if (!this.durationV) {
      this.durationV = 500;
    }
    const [animation, config] = this.getAnimationAndConfig();
    const callback = this.callbackV;
    const delay = this.getDelay();
    const customAnimationFactory = this.customAnimationFactory;
    const progressAnimation = this.getStyleProgressAnimation();

    if (this.transitionType === SharedTransitionType.PROGRESS_ANIMATION) {
      return (layoutAnimationValues) => {
        'worklet';
        const values =
          layoutAnimationValues as unknown as SharedTransitionAnimationsValues;
        const initialValues = progressAnimation(values, 0);
        return {
          initialValues,
          animations: progressDrivenAnimations(
            values,
            initialValues,
            progressAnimation,
            () => delayFunction(delay, animation(1, config))
          ),
          callback,
        };
      };
    }

    if (customAnimationFactory) {
      return (layoutAnimationValues) => {
        'worklet';
        const values =
          layoutAnimationValues as unknown as SharedTransitionAnimationsValues;
        const animations = withTransformMatrixAsTransform(
          customAnimationFactory(values)
        );
        return {
          initialValues: getCustomInitialStyle(values, animations),
          animations: mapAnimations(animations, (customAnimation) =>
            delayFunction(delay, customAnimation)
          ) as StyleProps,
          callback,
        };
      };
    }

    return (layoutAnimationValues) => {
      'worklet';
      const values =
        layoutAnimationValues as unknown as SharedTransitionAnimationsValues;
      const animateValue = (target: unknown): unknown => {
        if (Array.isArray(target)) {
          return target.map(animateValue);
        }
        if (typeof target === 'object' && target !== null) {
          const targetRecord = target as Record<string, unknown>;
          const result: Record<string, unknown> = {};
          for (const key in targetRecord) {
            result[key] = animateValue(targetRecord[key]);
          }
          return result;
        }
        return delayFunction(delay, animation(target, config));
      };
      const changed = getChangedStyles(values);
      const animations: Record<string, unknown> = {};
      for (const { key, target } of changed) {
        animations[key] =
          key === 'transform'
            ? [
                {
                  matrix: delayFunction(
                    delay,
                    animation((target as { matrix: number[] }).matrix, config)
                  ),
                },
              ]
            : animateValue(target);
      }

      return {
        initialValues: getInitialStyle(changed),
        animations,
        callback,
      };
    };
  };

  private getStyleProgressAnimation(): ProgressSharedTransitionAnimation {
    const progressAnimation =
      this.progressAnimationFactory ?? defaultProgressAnimation;
    return (values, progress) => {
      'worklet';
      // Animated styles process only the colors of individually animated shadows.
      return withProcessedBoxShadow(
        withTransformMatrixAsTransform(progressAnimation(values, progress))
      );
    };
  }

  /**
   * Gets the progress animation used for transitions that follow the screen
   * transition progress. This is used internally by the layout animations
   * system.
   */
  getProgressAnimation(): ProgressSharedTransitionAnimation {
    const styleProgressAnimation = this.getStyleProgressAnimation();
    return (values, progress) => {
      'worklet';
      // Native progress transitions apply the style without the color processing of animated styles.
      const style = styleProgressAnimation(values, progress);
      processColorsInProps(style);
      return style;
    };
  }
}
