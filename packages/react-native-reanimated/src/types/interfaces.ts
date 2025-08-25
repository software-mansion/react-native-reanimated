'use strict';

import type { IAnimatedComponentInternalBase } from '../createAnimatedComponent/commonTypes';
import type { ReanimatedEvent } from './events';

export interface IWorkletEventHandler<Event extends object> {
  updateEventHandler: (
    newWorklet: (event: ReanimatedEvent<Event>) => void,
    newEvents: string[]
  ) => void;
  registerForEvents: (viewTag: number, fallbackEventName?: string) => void;
  unregisterFromEvents: (viewTag: number) => void;
}

export interface IInlinePropManager {
  attachInlineProps(
    animatedComponent: React.Component<unknown, unknown>,
    viewInfo: ViewInfo
  ): void;
  detachInlineProps(): void;
}

export interface IAnimatedComponentInternal
  extends IAnimatedComponentInternalBase {
  _animatedStyles: StyleProps[];
  _prevAnimatedStyles: StyleProps[];
  _animatedProps: Partial<AnimatedComponentProps>[];
  _prevAnimatedProps: Partial<AnimatedComponentProps>[];
  _isFirstRender: boolean;
  jestInlineStyle: NestedArray<StyleProps> | undefined;
  jestAnimatedStyle: { value: StyleProps };
  jestAnimatedProps: { value: Partial<AnimatedComponentProps> };
  _InlinePropManager: IInlinePropManager;
  _PropsFilter: IPropsFilter;
  /** Doesn't exist on web. */
  _NativeEventsManager?: INativeEventsManager;
  context: React.ContextType<typeof SkipEnteringContext>;
  setNativeProps: (props: StyleProps) => void;
}

export interface IAnimatedComponentInternalBase {
  ChildComponent: AnyComponent;
  _componentRef: AnimatedComponentRef | HTMLElement | null;
  _hasAnimatedRef: boolean;
  _viewInfo?: ViewInfo;

  /**
   * Used for Layout Animations and Animated Styles. It is not related to event
   * handling.
   */
  getComponentViewTag: () => number;
}

export interface IJSPropsUpdater {
  registerComponent(
    animatedComponent: AnimatedComponentType,
    jsProps: string[]
  ): void;
  unregisterComponent(animatedComponent: AnimatedComponentType): void;
  updateProps(operations: JSPropsOperation[]): void;
}

export interface INativeEventsManager {
  attachEvents(): void;
  detachEvents(): void;
  updateEvents(prevProps: AnimatedComponentProps<InitialComponentProps>): void;
}

export interface IPropsFilter {
  filterNonAnimatedProps: (
    component: AnimatedComponentType
  ) => Record<string, unknown>;
}
