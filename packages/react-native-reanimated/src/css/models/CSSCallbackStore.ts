'use strict';

type CSSCallbackMap<Prop extends string, Payload> = Partial<
  Record<Prop, ((payload: Payload) => void) | undefined>
>;

/**
 * Holds the user's CSS callbacks and tracks which of them are present.
 *
 * Callbacks are read from a mutable slot at fire time, so a callback replaced
 * by a re-render can never fire, and re-created inline arrow functions cost
 * nothing. Subscription is driven by presence rather than identity, so
 * subclasses are only notified when a callback appears or disappears.
 */
export default abstract class CSSCallbackStore<Prop extends string, Payload> {
  private callbacks: CSSCallbackMap<Prop, Payload> = {};
  private readonly present = new Set<Prop>();
  private readonly props: readonly Prop[];

  constructor(props: readonly Prop[]) {
    this.props = props;
  }

  sync(callbacks: CSSCallbackMap<Prop, Payload>): void {
    this.callbacks = callbacks;

    const added: Prop[] = [];
    const removed: Prop[] = [];

    for (const prop of this.props) {
      const hasCallback = typeof callbacks[prop] === 'function';

      if (hasCallback && !this.present.has(prop)) {
        this.present.add(prop);
        added.push(prop);
      } else if (!hasCallback && this.present.has(prop)) {
        this.present.delete(prop);
        removed.push(prop);
      }
    }

    if (added.length > 0 || removed.length > 0) {
      this.onPresenceChanged(added, removed, this.present);
    }
  }

  detach(): void {
    this.sync({});
  }

  protected invoke(prop: Prop, payload: Payload): void {
    this.callbacks[prop]?.(payload);
  }

  protected abstract onPresenceChanged(
    added: readonly Prop[],
    removed: readonly Prop[],
    present: ReadonlySet<Prop>
  ): void;
}
