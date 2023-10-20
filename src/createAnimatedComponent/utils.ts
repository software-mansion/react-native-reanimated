'use strict';
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
import type { JSPropUpdater } from './JSPropUpdater';
import type { SkipEnteringContext } from '../reanimated2/component/LayoutAnimationConfig';
import type { ShadowNodeWrapper } from '../reanimated2/commonTypes';
import type { ViewConfig } from '../ConfigHelper';

export interface AnimatedProps extends Record<string, unknown> {
  viewDescriptors?: ViewDescriptorsSet;
  viewsRef?: ViewRefSet<unknown>;
  initial?: SharedValue<StyleProps>;
}

export interface ViewInfo {
  viewTag: number | HTMLElement | null;
  viewName: string | null;
  shadowNodeWrapper: ShadowNodeWrapper | null;
  viewConfig: ViewConfig;
}

export interface IInlinePropManager {
  attachInlineProps(
    animatedComponent: React.Component<unknown, unknown>,
    viewInfo: ViewInfo
  ): void;
  detachInlineProps(): void;
}

export interface IPropsFilter {
  filterNonAnimatedProps: (
    component: React.Component<unknown, unknown> & AnimatedComponentClass
  ) => Record<string, unknown>;
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

export interface ReanimatedComponentRef extends Component {
  setNativeProps?: (props: Record<string, unknown>) => void;
  getScrollableNode?: () => ReanimatedComponentRef;
  getAnimatableRef?: () => ReanimatedComponentRef;
}

export interface AnimatedComponentClass {
  _styles: StyleProps[] | null;
  _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
  _viewTag: number;
  _isFirstRender: boolean;
  animatedStyle: { value: StyleProps };
  _component: ReanimatedComponentRef | HTMLElement | null;
  _sharedElementTransition: SharedTransition | null;
  _JSPropUpdater: JSPropUpdater;
  _InlinePropManager: IInlinePropManager;
  _PropsFilter: IPropsFilter;
  _viewInfo?: ViewInfo;
  context: React.ContextType<typeof SkipEnteringContext>;
}

type NestedArray<T> = T | NestedArray<T>[];

export interface InitialComponentProps extends Record<string, unknown> {
  ref?: Ref<Component>;
  collapsable?: boolean;
}

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
