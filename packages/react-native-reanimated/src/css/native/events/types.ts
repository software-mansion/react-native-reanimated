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

/** A single CSS event as it comes from the native side. */
export type NativeCSSEvent = {
  tag: number;
  type: CSSEventType;
  /** Animation name for animation events, RN property name for transitions. */
  name: string;
  /** Already converted to seconds by the native side. */
  elapsedTime: number;
};

export type CSSEventHandler = (events: NativeCSSEvent[]) => void;

/** Receives the CSS events addressed to a single view tag. */
export interface CSSEventSubscriber {
  handleCSSEvent(event: NativeCSSEvent): void;
}
