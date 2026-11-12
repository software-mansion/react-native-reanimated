'use strict';
import { defineAnimation, withSpring, withTiming } from '../animation';
import type { AffineMatrixFlat } from '../animation/transformationMatrix/matrixUtils';
import {
  interpolateMatrix,
  prepareMatrixInterpolation,
} from '../animation/transformationMatrix/matrixUtils';
import { convertToRGBA, isColor, rgbaArrayToRGBAColor } from '../Colors';
import { logger, processBoxShadow, processColorsInProps } from '../common';
import type {
  Animation,
  AnimationObject,
  EntryAnimationsValues,
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
  StyleProps,
  Timestamp,
} from '../commonTypes';
import { Easing } from '../Easing';
import { interpolateColor } from '../interpolateColor';
import type { BaseAnimationBuilder } from './animationBuilder';
import { ComplexAnimationBuilder } from './animationBuilder';

const DEFAULT_DURATION = 500;

export type FadeContentConfig = {
  /**
   * The fade-out of the children of the moving view. `end` is the progress of
   * the move, more than 0 and at most 1, at which they reach opacity 0. A value
   * below 0.000001 works as 0.000001. Defaults to 1.
   */
  fadeOut?: { end?: number };
  /**
   * The fade-in of the children of the target view after the move. `duration`
   * is in milliseconds. Defaults to half of the transition duration, or 250 ms
   * when `springify()` gets no duration.
   */
  fadeIn?: { duration?: number };
};

export type SharedTransitionContentFade = {
  fadeIn: EntryExitAnimationFunction;
  fadeOutEnd: number;
};

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
const GEOMETRY_KEYS = [
  'originX',
  'originY',
  'width',
  'height',
  'transform',
  'transformOrigin',
];

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

// A transparent color takes the RGB of the other color, as in
// `interpolateColor`, so that the fade does not pass through gray.
function matchTransparentColor(color: unknown, otherColor: unknown): unknown {
  'worklet';
  if (
    !isColor(color) ||
    !isColor(otherColor) ||
    convertToRGBA(color)[3] !== 0
  ) {
    return color;
  }
  const [red, green, blue] = convertToRGBA(otherColor);
  return rgbaArrayToRGBAColor([red, green, blue, 0]);
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
    const isColorStyle = name.endsWith('Color');
    changed.push({
      key: name[0].toLowerCase() + name.slice(1),
      current: isColorStyle ? matchTransparentColor(current, target) : current,
      target: isColorStyle ? matchTransparentColor(target, current) : target,
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

// Only `fadeContent()` adds the content opacity to the values.
function getContentOpacityChange(values: SharedTransitionAnimationsValues) {
  'worklet';
  const record = values as unknown as Record<string, unknown>;
  const current = record.currentContentOpacity;
  const target = record.targetContentOpacity;
  return typeof current === 'number' &&
    typeof target === 'number' &&
    current !== target
    ? { current, target }
    : undefined;
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

// The snapshot leaves out a border corner or side that neither view sets, so
// it starts from the shorthand that the view renders.
function getSourceValue(record: Record<string, unknown>, key: string) {
  'worklet';
  const current = record['current' + key[0].toUpperCase() + key.slice(1)];
  if (current !== undefined || !key.startsWith('border')) {
    return current;
  }
  const property = ['Radius', 'Width', 'Color'].find((suffix) =>
    key.endsWith(suffix)
  );
  return property ? record['currentBorder' + property] : undefined;
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
    const current = getSourceValue(record, key);
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

  fadeContentV?: FadeContentConfig;

  private customAnimationFactory?: CustomSharedTransitionAnimation;
  private progressAnimationFactory?: ProgressSharedTransitionAnimation;
  private transitionType: SharedTransitionType = SharedTransitionType.ANIMATION;

  static createInstance<T extends typeof BaseAnimationBuilder>(
    this: T
  ): InstanceType<T> {
    return new SharedTransition() as InstanceType<T>;
  }

  /**
   * Fades the children of the shared view out while it moves, and fades the
   * children of the target view in when it lands. The shared view itself stays
   * visible. Use it when the two views have different children. Can be chained
   * alongside other [layout animation
   * modifiers](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#layout-animation-modifier).
   *
   * @param config - When the fade-out ends and how long the fade-in lasts.
   */
  static fadeContent<T extends typeof SharedTransition>(
    this: T,
    config?: FadeContentConfig
  ): InstanceType<T> {
    const instance = this.createInstance();
    return instance.fadeContent(config);
  }

  fadeContent(config: FadeContentConfig = {}): this {
    const { fadeOut, fadeIn } = validFadeContentConfig(config);
    this.fadeContentV = {
      fadeOut: { end: validFadeOutEnd(validOptions('fadeOut', fadeOut)?.end) },
      fadeIn: {
        duration: validFadeInDuration(validOptions('fadeIn', fadeIn)?.duration),
      },
    };
    return this;
  }

  buildContentFade(): SharedTransitionContentFade | undefined {
    if (!this.fadeContentV) {
      return undefined;
    }
    const { fadeOut, fadeIn } = this.fadeContentV;
    return {
      fadeIn: this.buildContentFadeIn(
        fadeIn?.duration ?? (this.durationV ?? DEFAULT_DURATION) / 2
      ),
      fadeOutEnd: fadeOut?.end ?? 1,
    };
  }

  /**
   * Tells if the built animation aims at the current geometry of the target in
   * each frame. Custom animations and timed progress animations use the
   * geometry that the target has when they start. This is used internally by
   * the layout animations system.
   */
  followsTarget(): boolean {
    return (
      this.transitionType !== SharedTransitionType.PROGRESS_ANIMATION &&
      !this.customAnimationFactory
    );
  }

  private buildContentFadeIn(duration: number): EntryExitAnimationFunction {
    const config = {
      duration,
      easing: Easing.out(Easing.quad),
      reduceMotion: this.reduceMotionV,
    };
    const fadeIn = (
      values: EntryAnimationsValues & { targetOpacity?: number }
    ) => {
      'worklet';
      const { targetOpacity } = values;
      return {
        initialValues: { opacity: 0 },
        animations: { opacity: withTiming(targetOpacity ?? 1, config) },
      };
    };
    return fadeIn;
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
    if (!this.isPhysicsBasedSpring()) {
      this.durationV ??= DEFAULT_DURATION;
    }
    const [animation, config] = this.getAnimationAndConfig();
    const delay = this.getDelay();
    const customAnimationFactory = this.customAnimationFactory;
    const progressAnimation = this.getStyleProgressAnimation();
    const fadeContentOpacity = (target: number) => {
      'worklet';
      return delayFunction(
        delay,
        animation(target, { ...config, overshootClamping: true })
      );
    };

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
        const delayedAnimations = mapAnimations(animations, (customAnimation) =>
          delayFunction(delay, customAnimation)
        ) as StyleProps;
        const contentOpacity = getContentOpacityChange(values);
        if (contentOpacity && animations.contentOpacity === undefined) {
          delayedAnimations.contentOpacity = fadeContentOpacity(
            contentOpacity.target
          );
        }
        return {
          initialValues: getCustomInitialStyle(values, animations),
          animations: delayedAnimations,
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
      const nonGeometry = changed.filter(
        ({ key }) => !GEOMETRY_KEYS.includes(key)
      );
      const hasGeometryChanges = changed.some(({ key }) =>
        GEOMETRY_KEYS.includes(key)
      );
      // Equal geometry needs a clock only to hold the start during the delay. The clamp keeps a fade-only spring
      // from ending after its fade.
      const geometryClock =
        hasGeometryChanges || delay > 0
          ? () =>
              delayFunction(
                delay,
                animation(
                  1,
                  hasGeometryChanges
                    ? config
                    : { ...config, overshootClamping: true }
                )
              )
          : undefined;
      const animations: Record<string, unknown> = geometryClock
        ? progressDrivenAnimations(
            values,
            { sharedTransitionGeometryProgress: 0 },
            (_values, progress) => {
              'worklet';
              return { sharedTransitionGeometryProgress: progress };
            },
            geometryClock
          )
        : { sharedTransitionGeometryProgress: 1 };
      for (const { key, target } of nonGeometry) {
        if (key === 'contentOpacity') {
          animations[key] = fadeContentOpacity(target as number);
          continue;
        }
        animations[key] = animateValue(target);
      }

      return {
        initialValues: {
          ...getInitialStyle(nonGeometry),
          sharedTransitionGeometryProgress: geometryClock ? 0 : 1,
        },
        animations,
      };
    };
  };

  // `withSpring` uses `duration` and `dampingRatio` in place of `damping`, `mass` and `stiffness`.
  private isPhysicsBasedSpring() {
    return (
      this.type === withSpring &&
      !this.dampingRatioV &&
      !!(this.dampingV || this.massV || this.stiffnessV)
    );
  }

  private getStyleProgressAnimation(): ProgressSharedTransitionAnimation {
    const progressAnimation =
      this.progressAnimationFactory ?? defaultProgressAnimation;
    return (values, progress) => {
      'worklet';
      let style = progressAnimation(values, progress);
      const contentOpacity = getContentOpacityChange(values);
      if (contentOpacity && style.contentOpacity === undefined) {
        style = {
          ...style,
          contentOpacity: interpolateValue(
            progress,
            contentOpacity.current,
            contentOpacity.target
          ),
        };
      }
      // Animated styles process only the colors of individually animated shadows.
      return withProcessedBoxShadow(withTransformMatrixAsTransform(style));
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

function isOptionsObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validFadeContentConfig(config: unknown): FadeContentConfig {
  if (isOptionsObject(config)) {
    return config;
  }
  logger.warnOnce(
    `fadeContent: the config must be an object, got ${describeValue(config)}. The defaults are used.`,
    0
  );
  return {};
}

function validOptions<T extends object>(
  name: keyof FadeContentConfig,
  options: T | undefined
) {
  if (options === undefined || isOptionsObject(options)) {
    return options;
  }
  logger.warnOnce(
    `fadeContent: ${name} must be an object, got ${describeValue(options)}. The defaults are used.`,
    0
  );
  return undefined;
}

function validFadeOutEnd(end: number | undefined) {
  if (end === undefined || (typeof end === 'number' && end > 0 && end <= 1)) {
    return end;
  }
  logger.warnOnce(
    `fadeContent: fadeOut.end must be more than 0 and at most 1, got ${describeValue(end)}. The default 1 is used.`,
    0
  );
  return undefined;
}

function validFadeInDuration(duration: number | undefined) {
  if (
    duration === undefined ||
    (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0)
  ) {
    return duration;
  }
  logger.warnOnce(
    `fadeContent: fadeIn.duration must be a finite number of milliseconds, 0 or more, got ${describeValue(duration)}. The default is used.`,
    0
  );
  return undefined;
}

function describeValue(value: unknown) {
  return typeof value === 'string' || Array.isArray(value)
    ? JSON.stringify(value)
    : String(value);
}
