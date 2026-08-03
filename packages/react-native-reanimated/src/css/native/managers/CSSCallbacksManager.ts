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
  CSSEventSubscriber,
  CSSEventType,
  NativeCSSEvent,
} from '../events';
import {
  ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE,
  cssCallbacksRegistry,
  getAnimationEventMaskFromProps,
  getTransitionEventMaskFromProps,
  TRANSITION_CALLBACK_PROP_BY_EVENT_TYPE,
} from '../events';

/** Callbacks of one CSS kind: routes its own events and keeps its own mask. */
class CSSCallbackSlot<Prop extends string, Payload> extends CSSCallbackStore<
  Prop,
  Payload
> {
  private eventMask = 0;

  constructor(
    private readonly propByEventType: Partial<Record<CSSEventType, Prop>>,
    private readonly maskFromProps: (props: Iterable<Prop>) => number,
    private readonly buildPayload: (event: NativeCSSEvent) => Payload,
    private readonly onMaskChange: () => void
  ) {
    super(Object.values(propByEventType));
  }

  getMask(): number {
    return this.eventMask;
  }

  handleOwnEvent(event: NativeCSSEvent): boolean {
    const prop = this.propByEventType[event.type];
    if (!prop) {
      return false;
    }
    this.invoke(prop, this.buildPayload(event));
    return true;
  }

  protected onPresenceChanged(present: ReadonlySet<Prop>): void {
    this.eventMask = this.maskFromProps(present);
    this.onMaskChange();
  }
}

export default class CSSCallbacksManager implements CSSEventSubscriber {
  private readonly viewTag: number;
  private readonly animationCallbacks: CSSCallbackSlot<
    CSSAnimationCallbackProp,
    CSSAnimationEvent
  >;
  private readonly transitionCallbacks: CSSCallbackSlot<
    CSSTransitionCallbackProp,
    CSSTransitionEvent
  >;

  constructor(viewTag: number) {
    this.viewTag = viewTag;
    const updateRegistration = () => this.updateRegistration();

    this.animationCallbacks = new CSSCallbackSlot(
      ANIMATION_CALLBACK_PROP_BY_EVENT_TYPE,
      getAnimationEventMaskFromProps,
      ({ name, elapsedTime }) => ({ animationName: name, elapsedTime }),
      updateRegistration
    );
    this.transitionCallbacks = new CSSCallbackSlot(
      TRANSITION_CALLBACK_PROP_BY_EVENT_TYPE,
      getTransitionEventMaskFromProps,
      ({ name, elapsedTime }) => ({ propertyName: name, elapsedTime }),
      updateRegistration
    );
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
    if (!this.animationCallbacks.handleOwnEvent(event)) {
      this.transitionCallbacks.handleOwnEvent(event);
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
