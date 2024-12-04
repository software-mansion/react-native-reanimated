'use strict';
import type { Ref, Component } from 'react';
import type {
  ShadowNodeWrapper,
  SharedValue,
  StyleProps,
} from '../commonTypes';
import type { ViewConfig } from '../ConfigHelper';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
import type {
  BaseAnimationBuilder,
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
  SharedTransition,
} from '../layoutReanimation';
import type { SkipEnteringContext } from '../component/LayoutAnimationConfig';

export interface AnimatedProps extends Record<string, unknown> {
  viewDescriptors?: ViewDescriptorsSet;
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

export interface INativeEventsManager {
  attachEvents(): void;
  detachEvents(): void;
  updateEvents(prevProps: AnimatedComponentProps<InitialComponentProps>): void;
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
  _isFirstRender: boolean;
  jestInlineStyle: NestedArray<StyleProps> | undefined;
  jestAnimatedStyle: { value: StyleProps };
  _componentRef: AnimatedComponentRef | HTMLElement | null;
  _sharedElementTransition: SharedTransition | null;
  _jsPropsUpdater: IJSPropsUpdater;
  _InlinePropManager: IInlinePropManager;
  _PropsFilter: IPropsFilter;
  /** Doesn't exist on web. */
  _NativeEventsManager?: INativeEventsManager;
  _viewInfo?: ViewInfo;
  context: React.ContextType<typeof SkipEnteringContext>;
  /**
   * Used for Shared Element Transitions, Layout Animations and Animated Styles.
   * It is not related to event handling.
   */
  getComponentViewTag: () => number;
}

export type NestedArray<T> = T | NestedArray<T>[];

export interface InitialComponentProps extends Record<string, unknown> {
  ref?: Ref<Component>;
  collapsable?: boolean;
}
