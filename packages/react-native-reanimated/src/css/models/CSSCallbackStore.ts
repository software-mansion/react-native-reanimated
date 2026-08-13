'use strict';

type CSSCallbackMap<Prop extends string, Payload> = Partial<
  Record<Prop, ((payload: Payload) => void) | undefined>
>;

/**
 * Which callbacks a sync changed, and which are present after it. Subclasses
 * need different parts of this, so it arrives as one object rather than as
 * positional arguments that half of them would have to name and ignore.
 */
export type CSSCallbackPresenceChange<Prop extends string> = {
  present: ReadonlySet<Prop>;
  added: readonly Prop[];
  removed: readonly Prop[];
};

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
      this.onPresenceChanged({ present: this.present, added, removed });
    }
  }

  detach(): void {
    this.sync({});
  }

  protected invoke(prop: Prop, payload: Payload): void {
    this.callbacks[prop]?.(payload);
  }

  protected abstract onPresenceChanged(
    change: CSSCallbackPresenceChange<Prop>
  ): void;
}
