'use strict';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';

type CallbackMap<Prop extends string, Payload> = Partial<
  Record<Prop, ((payload: Payload) => void) | undefined>
>;

export class CSSCallbackListeners<Prop extends string, Payload> {
  private callbacks: CallbackMap<Prop, Payload> = {};
  private readonly attachedListeners = new Map<Prop, EventListener>();
  private readonly props: Prop[];

  constructor(
    private readonly element: ReanimatedHTMLElement,
    private readonly eventNameByProp: Record<Prop, string>,
    private readonly buildPayload: (event: Event) => Payload
  ) {
    this.props = Object.keys(eventNameByProp) as Prop[];
  }

  sync(callbacks: CallbackMap<Prop, Payload>): void {
    this.callbacks = callbacks;

    for (const prop of this.props) {
      const eventName = this.eventNameByProp[prop];
      const hasCallback = typeof callbacks[prop] === 'function';
      const listener = this.attachedListeners.get(prop);

      if (hasCallback && !listener) {
        const newListener = this.createListener(prop);
        this.attachedListeners.set(prop, newListener);
        this.element.addEventListener(eventName, newListener);
      } else if (!hasCallback && listener) {
        this.element.removeEventListener(eventName, listener);
        this.attachedListeners.delete(prop);
      }
    }
  }

  detach(): void {
    this.sync({});
  }

  private createListener(prop: Prop): EventListener {
    return (event: Event) => {
      // Animation/transition events bubble; only handle this element's own.
      if (event.target !== this.element) {
        return;
      }
      this.callbacks[prop]?.(this.buildPayload(event));
    };
  }
}
