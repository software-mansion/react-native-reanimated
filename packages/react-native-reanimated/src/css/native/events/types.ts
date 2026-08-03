'use strict';

export type CSSAnimationEventType =
  | 'animationStart'
  | 'animationEnd'
  | 'animationIteration'
  | 'animationCancel';

export type CSSTransitionEventType =
  | 'transitionRun'
  | 'transitionStart'
  | 'transitionEnd'
  | 'transitionCancel';

export type CSSEventType = CSSAnimationEventType | CSSTransitionEventType;

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

/**
 * Bit requested for each event type. The native side emits an event only when
 * its bit is set, so these values must stay in sync with the C++ ones.
 */
export const CSS_EVENT_MASK = {
  animationStart: 1 << 0,
  animationEnd: 1 << 1,
  animationIteration: 1 << 2,
  animationCancel: 1 << 3,
  transitionRun: 1 << 4,
  transitionStart: 1 << 5,
  transitionEnd: 1 << 6,
  transitionCancel: 1 << 7,
} as const satisfies Record<CSSEventType, number>;
