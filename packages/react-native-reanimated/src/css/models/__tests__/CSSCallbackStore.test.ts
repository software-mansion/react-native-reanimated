'use strict';
import CSSCallbackStore from '../CSSCallbackStore';

type Prop = 'onFoo' | 'onBar';

type Payload = { detail: string };

type PresenceChange = Prop[];

class TestStore extends CSSCallbackStore<Prop, Payload> {
  readonly changes: PresenceChange[] = [];

  constructor() {
    super(['onFoo', 'onBar']);
  }

  fire(prop: Prop, payload: Payload): void {
    this.invoke(prop, payload);
  }

  protected onPresenceChanged(present: ReadonlySet<Prop>): void {
    this.changes.push([...present]);
  }
}

describe('CSSCallbackStore', () => {
  let store: TestStore;

  beforeEach(() => {
    store = new TestStore();
  });

  test('reports the prop as present the first time a callback is provided', () => {
    store.sync({ onFoo: jest.fn() });

    expect(store.changes).toEqual([['onFoo']]);
  });

  test('does not report a change when only the callback identity changes', () => {
    store.sync({ onFoo: jest.fn() });
    store.sync({ onFoo: jest.fn() });

    expect(store.changes).toHaveLength(1);
  });

  test('invokes the callback from the latest sync', () => {
    const first = jest.fn();
    const second = jest.fn();

    store.sync({ onFoo: first });
    store.sync({ onFoo: second });
    store.fire('onFoo', { detail: 'x' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ detail: 'x' });
  });

  test('drops the prop from the set when its callback becomes undefined', () => {
    store.sync({ onFoo: jest.fn() });
    store.sync({ onFoo: undefined });

    expect(store.changes[1]).toEqual([]);
  });

  test('reports the whole set after a sync that both adds and removes', () => {
    store.sync({ onFoo: jest.fn() });
    store.sync({ onBar: jest.fn() });

    expect(store.changes[1]).toEqual(['onBar']);
  });

  // Every other case reports a set that happens to equal the props just added.
  test('reports a prop that was already present alongside the new one', () => {
    store.sync({ onFoo: jest.fn() });
    store.sync({ onBar: jest.fn(), onFoo: jest.fn() });

    expect(store.changes[1]).toEqual(['onFoo', 'onBar']);
  });

  test('ignores props that the store does not manage', () => {
    store.sync({ onBaz: jest.fn() } as never);

    expect(store.changes).toHaveLength(0);
  });

  test('detach removes every present prop and stops invocations', () => {
    const onFoo = jest.fn();
    store.sync({ onFoo, onBar: jest.fn() });
    store.detach();

    expect(store.changes[1]).toEqual([]);

    store.fire('onFoo', { detail: 'x' });
    expect(onFoo).not.toHaveBeenCalled();
  });

  test('re-adds a prop after detach', () => {
    store.sync({ onFoo: jest.fn() });
    store.detach();
    store.sync({ onFoo: jest.fn() });

    expect(store.changes[2]).toEqual(['onFoo']);
  });

  test('detach on an empty store reports nothing', () => {
    store.detach();

    expect(store.changes).toHaveLength(0);
  });
});
