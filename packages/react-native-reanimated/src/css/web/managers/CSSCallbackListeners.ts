'use strict';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { CSSCallbackPresenceChange } from '../../models';
import { CSSCallbackStore } from '../../models';

export class CSSCallbackListeners<
  Prop extends string,
  Payload,
> extends CSSCallbackStore<Prop, Payload> {
  private readonly attachedListeners = new Map<Prop, EventListener>();

  constructor(
    private readonly element: ReanimatedHTMLElement,
    private readonly eventNameByProp: Record<Prop, string>,
    private readonly buildPayload: (event: Event) => Payload
  ) {
    super(Object.keys(eventNameByProp) as Prop[]);
  }

  protected onPresenceChanged({
    added,
    removed,
  }: CSSCallbackPresenceChange<Prop>): void {
    for (const prop of removed) {
      const listener = this.attachedListeners.get(prop);
      if (listener) {
        this.attachedListeners.delete(prop);
        this.element.removeEventListener(this.eventNameByProp[prop], listener);
      }
    }

    for (const prop of added) {
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
