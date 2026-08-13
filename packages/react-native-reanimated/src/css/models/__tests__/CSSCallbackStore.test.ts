'use strict';
import CSSCallbackStore from '../CSSCallbackStore';

type Prop = 'onFoo' | 'onBar';

type Payload = { detail: string };

type PresenceChange = {
  added: Prop[];
  removed: Prop[];
  present: Prop[];
};

class TestStore extends CSSCallbackStore<Prop, Payload> {
  readonly changes: PresenceChange[] = [];

  constructor() {
    super(['onFoo', 'onBar']);
  }

  fire(prop: Prop, payload: Payload): void {
    this.invoke(prop, payload);
  }

  protected onPresenceChanged(
    present: ReadonlySet<Prop>,
    added: readonly Prop[],
    removed: readonly Prop[]
  ): void {
    this.changes.push({
      added: [...added],
      present: [...present],
      removed: [...removed],
    });
  }
}

describe('CSSCallbackStore', () => {
  let store: TestStore;

  beforeEach(() => {
    store = new TestStore();
  });

  test('reports a prop as added the first time a callback is provided', () => {
    store.sync({ onFoo: jest.fn() });

    expect(store.changes).toEqual([
      { added: ['onFoo'], present: ['onFoo'], removed: [] },
    ]);
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

  test('reports a prop as removed when its callback becomes undefined', () => {
    store.sync({ onFoo: jest.fn() });
    store.sync({ onFoo: undefined });

    expect(store.changes[1]).toEqual({
      added: [],
      present: [],
      removed: ['onFoo'],
    });
  });

  test('reports additions and removals from a single sync together', () => {
    store.sync({ onFoo: jest.fn() });
    store.sync({ onBar: jest.fn() });

    expect(store.changes[1]).toEqual({
      added: ['onBar'],
      present: ['onBar'],
      removed: ['onFoo'],
    });
  });

  test('ignores props that the store does not manage', () => {
    store.sync({ onBaz: jest.fn() } as never);

    expect(store.changes).toHaveLength(0);
  });

  test('detach removes every present prop and stops invocations', () => {
    const onFoo = jest.fn();
    store.sync({ onFoo, onBar: jest.fn() });
    store.detach();

    expect(store.changes[1]).toEqual({
      added: [],
      present: [],
      removed: ['onFoo', 'onBar'],
    });

    store.fire('onFoo', { detail: 'x' });
    expect(onFoo).not.toHaveBeenCalled();
  });

  test('re-adds a prop after detach', () => {
    store.sync({ onFoo: jest.fn() });
    store.detach();
    store.sync({ onFoo: jest.fn() });

    expect(store.changes[2]).toEqual({
      added: ['onFoo'],
      present: ['onFoo'],
      removed: [],
    });
  });

  test('detach on an empty store reports nothing', () => {
    store.detach();

    expect(store.changes).toHaveLength(0);
  });
});
