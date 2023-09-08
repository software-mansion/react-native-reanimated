import type { Ref, Component } from 'react';
import type {
  StyleProps,
  BaseAnimationBuilder,
  ILayoutAnimationBuilder,
  EntryExitAnimationFunction,
  SharedTransition,
  SharedValue,
} from '../reanimated2';
import type {
  ViewDescriptorsSet,
  ViewRefSet,
} from '../reanimated2/ViewDescriptorsSet';

export interface AnimatedProps extends Record<string, unknown> {
  viewDescriptors?: ViewDescriptorsSet;
  viewsRef?: ViewRefSet<unknown>;
  initial?: SharedValue<StyleProps>;
}

export type AnimatedComponentProps<P extends Record<string, unknown>> = P & {
  forwardedRef?: Ref<Component>;
  style?: NestedArray<StyleProps>;
  animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
  animatedStyle?: StyleProps;
  layout?:
    | BaseAnimationBuilder
    | ILayoutAnimationBuilder
    | typeof BaseAnimationBuilder;
  entering?:
    | BaseAnimationBuilder
    | typeof BaseAnimationBuilder
    | EntryExitAnimationFunction
    | Keyframe;
  exiting?:
    | BaseAnimationBuilder
    | typeof BaseAnimationBuilder
    | EntryExitAnimationFunction
    | Keyframe;
  sharedTransitionTag?: string;
  sharedTransitionStyle?: SharedTransition;
};

type NestedArray<T> = T | NestedArray<T>[];

export function flattenArray<T>(array: NestedArray<T>): T[] {
  if (!Array.isArray(array)) {
    return [array];
  }
  const resultArr: T[] = [];

  const _flattenArray = (arr: NestedArray<T>[]): void => {
    arr.forEach((item) => {
      if (Array.isArray(item)) {
        _flattenArray(item);
      } else {
        resultArr.push(item);
      }
    });
  };
  _flattenArray(array);
  return resultArr;
}

export const has = <K extends string>(
  key: K,
  x: unknown
): x is typeof x & { [key in K]: unknown } => {
  if (typeof x === 'function' || typeof x === 'object') {
    if (x === null || x === undefined) {
      return false;
    } else {
      return key in x;
    }
  }
  return false;
};
