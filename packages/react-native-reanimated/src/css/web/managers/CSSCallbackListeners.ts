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
    this.detachFrame ??= requestAnimationFrame(() => {
      this.detachFrame = null;
      this.detach();
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
