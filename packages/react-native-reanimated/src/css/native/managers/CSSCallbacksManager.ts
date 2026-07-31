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

// Every CSS event for a view reaches this manager, so the table doubles as the
// check for whether the kind is one it owns.
const isAnimationEventType = (
  type: CSSEventType
): type is CSSAnimationEventType => type in CALLBACK_PROP_BY_EVENT_TYPE;

/** A view tag of -1 means that the component has no mounted view yet. */
const NO_VIEW_TAG = -1;

export default class CSSCallbacksManager
  extends CSSCallbackStore<CSSAnimationCallbackProp, CSSAnimationEvent>
  implements CSSEventSubscriber
{
  private readonly viewTag: number;
  private eventMask = 0;

  constructor(viewTag: number) {
    super(CALLBACK_PROPS);
    this.viewTag = viewTag;
  }

  getMask(): number {
    return this.eventMask;
  }

  handleCSSEvent(event: NativeCSSEvent): void {
    // TODO: transition events arrive here too and are dropped, so transition
    // callbacks never fire on native. They should reach the user once the
    // native side emits them.
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

    if (this.viewTag === NO_VIEW_TAG) {
      return;
    }
    if (present.size > 0) {
      cssCallbacksRegistry.register(this.viewTag, this);
    } else {
      cssCallbacksRegistry.unregister(this.viewTag, this);
    }
  }
}
