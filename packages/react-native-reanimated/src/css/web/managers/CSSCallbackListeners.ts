'use strict';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import { CSSCallbackStore } from '../../models';

type CallbackMap<Prop extends string, Payload> = Partial<
  Record<Prop, ((payload: Payload) => void) | undefined>
>;

export class CSSCallbackListeners<
  Prop extends string,
  Payload,
> extends CSSCallbackStore<Prop, Payload> {
  private readonly attachedListeners = new Map<Prop, EventListener>();
  private detachFrame: number | null = null;

  constructor(
    private readonly element: ReanimatedHTMLElement,
    private readonly eventNameByProp: Record<Prop, string>,
    private readonly buildPayload: (event: Event) => Payload
  ) {
    super(Object.keys(eventNameByProp) as Prop[]);
  }

  override sync(callbacks: CallbackMap<Prop, Payload>): void {
    if (this.detachFrame !== null) {
      cancelAnimationFrame(this.detachFrame);
      this.detachFrame = null;
    }
    super.sync(callbacks);
  }

  scheduleDetach(): void {
    if (this.attachedListeners.size === 0 || this.detachFrame !== null) {
      return;
    }

    // A suspended frame must not keep an otherwise unreachable element and its
    // callbacks alive. Older browsers retain the existing cleanup behavior.
    const ref =
      typeof WeakRef === 'undefined'
        ? { deref: () => this }
        : new WeakRef(this);
    this.detachFrame = CSSCallbackListeners.scheduleDetachFrame(ref, false);
  }

  private static scheduleDetachFrame<Prop extends string, Payload>(
    ref: { deref(): CSSCallbackListeners<Prop, Payload> | undefined },
    finalFrame: boolean
  ): number {
    // Keep this closure outside the instance method so it captures only ref,
    // never the manager or a dereferenced instance from the previous frame.
    return requestAnimationFrame(() => {
      const listeners = ref.deref();
      if (!listeners) {
        return;
      }
      if (finalFrame) {
        listeners.detachFrame = null;
        listeners.detach();
      } else {
        // Cleanup can start during animation-event dispatch. The first frame
        // may run in that same rendering update; cancellations arrive next.
        listeners.detachFrame = CSSCallbackListeners.scheduleDetachFrame(
          ref,
          true
        );
      }
    });
  }

  protected onPresenceChanged(present: ReadonlySet<Prop>): void {
    for (const [prop, listener] of this.attachedListeners) {
      if (!present.has(prop)) {
        this.attachedListeners.delete(prop);
        this.element.removeEventListener(this.eventNameByProp[prop], listener);
      }
    }

    for (const prop of present) {
      if (this.attachedListeners.has(prop)) {
        continue;
      }
      const listener = this.createListener(prop);
      this.attachedListeners.set(prop, listener);
      this.element.addEventListener(this.eventNameByProp[prop], listener);
    }
  }

  private createListener(prop: Prop): EventListener {
    return (event: Event) => {
      // Animation/transition events bubble; only handle this element's own.
      if (event.target !== this.element) {
        return;
      }
      this.invoke(prop, this.buildPayload(event));
    };
  }
}
