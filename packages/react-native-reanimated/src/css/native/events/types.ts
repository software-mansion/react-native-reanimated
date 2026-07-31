'use strict';

type CSSAnimationEventType =
  | 'animationStart'
  | 'animationEnd'
  | 'animationIteration'
  | 'animationCancel';

type CSSTransitionEventType =
  | 'transitionRun'
  | 'transitionStart'
  | 'transitionEnd'
  | 'transitionCancel';

type CSSEventType = CSSAnimationEventType | CSSTransitionEventType;

export type NativeCSSEvent = {
  tag: number;
  type: CSSEventType;
  /** Animation name for animation events, RN property name for transitions. */
  name: string;
  /** Already converted to seconds by the native side. */
  elapsedTime: number;
};

export type CSSEventHandler = (events: NativeCSSEvent[]) => void;

export interface CSSEventSubscriber {
  handleCSSEvent(event: NativeCSSEvent): void;
}
