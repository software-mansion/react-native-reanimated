'use strict';
import type { Component, MutableRefObject, Ref } from 'react';

import type {
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
  ShadowNodeWrapper,
  SharedValue,
  StyleProps,
} from '../commonTypes';
import type { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import type { BaseAnimationBuilder } from '../layoutReanimation';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';

export interface AnimatedProps extends Record<string, unknown> {
  viewDescriptors?: ViewDescriptorsSet;
  initial?: SharedValue<StyleProps>;
}

export interface ViewInfo {
  viewTag: number | AnimatedComponentRef | HTMLElement | null;
  shadowNodeWrapper: ShadowNodeWrapper | null;
  DOMElement?: HTMLElement | null;
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

export type AnimatedComponentProps<
  P extends Record<string, unknown> = Record<string, unknown>,
> = P & {
  ref?: Ref<Component>;
  style?: NestedArray<StyleProps>;
  animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
  jestAnimatedValues?: MutableRefObject<AnimatedProps>;
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
};

export interface AnimatedComponentRef extends Component {
  setNativeProps?: (props: Record<string, unknown>) => void;
  getScrollableNode?: () => AnimatedComponentRef;
  getAnimatableRef?: () => AnimatedComponentRef;
  // Case for SVG components on Web
  elementRef?: React.RefObject<HTMLElement>;
}

export interface IAnimatedComponentInternal {
  ChildComponent: AnyComponent;
  _animatedStyles: StyleProps[];
  _prevAnimatedStyles: StyleProps[];
  _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
  _isFirstRender: boolean;
  jestInlineStyle: NestedArray<StyleProps> | undefined;
  jestAnimatedStyle: { value: StyleProps };
  jestAnimatedProps: { value: AnimatedProps };
  _componentRef: AnimatedComponentRef | HTMLElement | null;
  _hasAnimatedRef: boolean;
  _jsPropsUpdater: IJSPropsUpdater;
  _InlinePropManager: IInlinePropManager;
  _PropsFilter: IPropsFilter;
  /** Doesn't exist on web. */
  _NativeEventsManager?: INativeEventsManager;
  _viewInfo?: ViewInfo;
  context: React.ContextType<typeof SkipEnteringContext>;
  /**
   * Used for Layout Animations and Animated Styles. It is not related to event
   * handling.
   */
  getComponentViewTag: () => number;

  /**
   * A function that will update the components state (the state is used for the
   * style prop)
   */
  _updateStylePropsJS: (props: StyleProps) => void;
}

export type NestedArray<T> = T | NestedArray<T>[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = React.ComponentType<any>;

export interface InitialComponentProps extends Record<string, unknown> {
  ref?: Ref<Component>;
  collapsable?: boolean;
}

export type ManagedAnimatedComponent = React.Component<
  AnimatedComponentProps<InitialComponentProps>
> &
  IAnimatedComponentInternal;
