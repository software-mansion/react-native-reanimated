'use strict';
import { CSSCallbackStore } from '../../models';
import type {
  CSSAnimationCallbackProp,
  CSSAnimationCallbacks,
  CSSAnimationEvent,
  CSSTransitionCallbackProp,
  CSSTransitionCallbacks,
  CSSTransitionEvent,
} from '../../types';
import type {
  CSSAnimationEventType,
  CSSEventSubscriber,
  CSSEventType,
  CSSTransitionEventType,
  NativeCSSEvent,
} from '../events';
import {
  ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE,
  cssCallbacksRegistry,
  getAnimationEventMaskFromProps,
  getTransitionEventMaskFromProps,
  TRANSITION_CALLBACK_PROP_BY_EVENT_TYPE,
} from '../events';

// Every CSS event for a view reaches both stores, so each table doubles as the
// check for whether the event is the kind that store owns.
const isAnimationEvent = (type: CSSEventType): type is CSSAnimationEventType =>
  type in ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE;

const isTransitionEvent = (
  type: CSSEventType
): type is CSSTransitionEventType =>
  type in TRANSITION_CALLBACK_PROP_BY_EVENT_TYPE;

/** The view's animation callbacks, and the mask of the events they need. */
class AnimationCallbacks extends CSSCallbackStore<
  CSSAnimationCallbackProp,
  CSSAnimationEvent
> {
  private eventMask = 0;

  constructor(private readonly onMaskChange: () => void) {
    super(Object.values(ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE));
  }

  getMask(): number {
    return this.eventMask;
  }

  /** Returns false for an event of the other kind, which this must not touch. */
  handleEvent(event: NativeCSSEvent): boolean {
    if (!isAnimationEvent(event.type)) {
      return false;
    }

    this.invoke(ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE[event.type], {
      animationName: event.name,
      elapsedTime: event.elapsedTime,
    });
    return true;
  }

  protected onPresenceChanged(
    present: ReadonlySet<CSSAnimationCallbackProp>
  ): void {
    this.eventMask = getAnimationEventMaskFromProps(present);
    this.onMaskChange();
  }
}

/** The view's transition callbacks, and the mask of the events they need. */
class TransitionCallbacks extends CSSCallbackStore<
  CSSTransitionCallbackProp,
  CSSTransitionEvent
> {
  private eventMask = 0;

  constructor(private readonly onMaskChange: () => void) {
    super(Object.values(TRANSITION_CALLBACK_PROP_BY_EVENT_TYPE));
  }

  getMask(): number {
    return this.eventMask;
  }

  /** Returns false for an event of the other kind, which this must not touch. */
  handleEvent(event: NativeCSSEvent): boolean {
    if (!isTransitionEvent(event.type)) {
      return false;
    }

    this.invoke(TRANSITION_CALLBACK_PROP_BY_EVENT_TYPE[event.type], {
      propertyName: event.name,
      elapsedTime: event.elapsedTime,
    });
    return true;
  }

  protected onPresenceChanged(
    present: ReadonlySet<CSSTransitionCallbackProp>
  ): void {
    this.eventMask = getTransitionEventMaskFromProps(present);
    this.onMaskChange();
  }
}

export default class CSSCallbacksManager implements CSSEventSubscriber {
  private readonly viewTag: number;
  private readonly animationCallbacks: AnimationCallbacks;
  private readonly transitionCallbacks: TransitionCallbacks;

  constructor(viewTag: number) {
    this.viewTag = viewTag;
    const updateRegistration = () => this.updateRegistration();

    this.animationCallbacks = new AnimationCallbacks(updateRegistration);
    this.transitionCallbacks = new TransitionCallbacks(updateRegistration);
  }

  getAnimationEventMask(): number {
    return this.animationCallbacks.getMask();
  }

  getTransitionEventMask(): number {
    return this.transitionCallbacks.getMask();
  }

  syncAnimationCallbacks(callbacks: CSSAnimationCallbacks | null): void {
    this.animationCallbacks.sync(callbacks ?? {});
  }

  syncTransitionCallbacks(callbacks: CSSTransitionCallbacks | null): void {
    this.transitionCallbacks.sync(callbacks ?? {});
  }

  detach(): void {
    this.animationCallbacks.detach();
    this.transitionCallbacks.detach();
  }

  /**
   * Unsubscribes without dropping the callbacks, so a cancel already emitted
   * for the unmounting view still reaches the user.
   */
  retire(): void {
    if (this.viewTag !== -1) {
      cssCallbacksRegistry.retire(this.viewTag, this);
    }
  }

  handleCSSEvent(event: NativeCSSEvent): void {
    if (!this.animationCallbacks.handleEvent(event)) {
      this.transitionCallbacks.handleEvent(event);
    }
  }

  private updateRegistration(): void {
    if (this.viewTag === -1) {
      return;
    }

    if (this.getAnimationEventMask() | this.getTransitionEventMask()) {
      cssCallbacksRegistry.register(this.viewTag, this);
    } else {
      cssCallbacksRegistry.unregister(this.viewTag, this);
    }
  }
}
