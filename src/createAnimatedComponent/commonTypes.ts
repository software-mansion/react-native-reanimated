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
    component: React.Component<unknown, unknown> & IAnimatedComponentInternal
  ) => Record<string, unknown>;
}

export interface IJSPropsUpdater {
  addOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown> &
      IAnimatedComponentInternal
  ): void;
  removeOnJSPropsChangeListener(
    animatedComponent: React.Component<unknown, unknown> &
      IAnimatedComponentInternal
  ): void;
}

export type LayoutAnimationStaticContext = {
  presetName: string;
};

export type AnimatedComponentProps<P extends Record<string, unknown>> = P & {
  forwardedRef?: Ref<Component>;
  style?: NestedArray<StyleProps>;
  animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
  animatedStyle?: StyleProps;
  layout?: (
    | BaseAnimationBuilder
    | ILayoutAnimationBuilder
    | typeof BaseAnimationBuilder
  ) &
    LayoutAnimationStaticContext;
  entering?: (
    | BaseAnimationBuilder
    | typeof BaseAnimationBuilder
    | EntryExitAnimationFunction
    | Keyframe
  ) &
    LayoutAnimationStaticContext;
  exiting?: (
    | BaseAnimationBuilder
    | typeof BaseAnimationBuilder
    | EntryExitAnimationFunction
    | Keyframe
  ) &
    LayoutAnimationStaticContext;
  sharedTransitionTag?: string;
  sharedTransitionStyle?: SharedTransition;
};

export interface AnimatedComponentRef extends Component {
  setNativeProps?: (props: Record<string, unknown>) => void;
  getScrollableNode?: () => AnimatedComponentRef;
  getAnimatableRef?: () => AnimatedComponentRef;
}

export interface IAnimatedComponentInternal {
  _styles: StyleProps[] | null;
  _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
  _viewTag: number;
  _isFirstRender: boolean;
  jestAnimatedStyle: { value: StyleProps };
  _component: AnimatedComponentRef | HTMLElement | null;
  _sharedElementTransition: SharedTransition | null;
  _jsPropsUpdater: IJSPropsUpdater;
  _InlinePropManager: IInlinePropManager;
  _PropsFilter: IPropsFilter;
  _viewInfo?: ViewInfo;
  context: React.ContextType<typeof SkipEnteringContext>;
}

export type NestedArray<T> = T | NestedArray<T>[];

export interface InitialComponentProps extends Record<string, unknown> {
  ref?: Ref<Component>;
  collapsable?: boolean;
}
