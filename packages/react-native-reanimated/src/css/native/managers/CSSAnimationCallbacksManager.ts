'use strict';
import { CSSCallbackStore } from '../../models';
import type { CSSAnimationCallbackProp, CSSAnimationEvent } from '../../types';
import type {
  CSSAnimationEventType,
  CSSEventSubscriber,
  CSSEventType,
  NativeCSSEvent,
} from '../events';
import {
  cssCallbacksRegistry,
  getAnimationEventMaskFromProps,
} from '../events';

const CALLBACK_PROP_BY_EVENT_TYPE: Record<
  CSSAnimationEventType,
  CSSAnimationCallbackProp
> = {
  animationStart: 'onAnimationStart',
  animationEnd: 'onAnimationEnd',
  animationIteration: 'onAnimationIteration',
  animationCancel: 'onAnimationCancel',
};

const CALLBACK_PROPS = Object.values(CALLBACK_PROP_BY_EVENT_TYPE);

const isAnimationEventType = (
  type: CSSEventType
): type is CSSAnimationEventType => type in CALLBACK_PROP_BY_EVENT_TYPE;

/** A view tag of -1 means that the component has no mounted view yet. */
const NO_VIEW_TAG = -1;

export default class CSSAnimationCallbacksManager
  extends CSSCallbackStore<CSSAnimationCallbackProp, CSSAnimationEvent>
  implements CSSEventSubscriber
{
  private readonly viewTag: number;
  private eventMask = 0;
  private isRegistered = false;

  constructor(viewTag: number) {
    super(CALLBACK_PROPS);
    this.viewTag = viewTag;
  }

  /** Bitmask of the events the native side has to emit for this view. */
  getMask(): number {
    return this.eventMask;
  }

  handleCSSEvent(event: NativeCSSEvent): void {
    if (!isAnimationEventType(event.type)) {
      return;
    }

    this.invoke(CALLBACK_PROP_BY_EVENT_TYPE[event.type], {
      animationName: event.name,
      elapsedTime: event.elapsedTime,
    });
  }

  protected onPresenceChanged(
    _added: readonly CSSAnimationCallbackProp[],
    _removed: readonly CSSAnimationCallbackProp[],
    present: ReadonlySet<CSSAnimationCallbackProp>
  ): void {
    this.eventMask = getAnimationEventMaskFromProps(present);

    if (present.size > 0) {
      this.register();
    } else {
      this.unregister();
    }
  }

  private register(): void {
    if (this.isRegistered || this.viewTag === NO_VIEW_TAG) {
      return;
    }
    this.isRegistered = true;
    cssCallbacksRegistry.register(this.viewTag, this);
  }

  private unregister(): void {
    if (!this.isRegistered) {
      return;
    }
    this.isRegistered = false;
    cssCallbacksRegistry.unregister(this.viewTag, this);
  }
}
