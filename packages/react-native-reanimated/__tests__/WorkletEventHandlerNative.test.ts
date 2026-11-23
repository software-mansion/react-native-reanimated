import { registerEventHandler, unregisterEventHandler } from '../src/core';
import { NativeEventsManager } from '../src/createAnimatedComponent/NativeEventsManager';
import { WorkletEventHandler } from '../src/WorkletEventHandler';

jest.mock('../src/core', () => ({
  ...jest.requireActual('../src/core'),
  registerEventHandler: jest.fn(),
  unregisterEventHandler: jest.fn(),
}));

jest.mock('../src/WorkletEventHandler', () =>
  jest.requireActual('../src/WorkletEventHandler.native')
);

const register = registerEventHandler as jest.Mock;
const unregister = unregisterEventHandler as jest.Mock;
let nextId = 100;

beforeEach(() => {
  register.mockReset();
  unregister.mockReset();
  register.mockImplementation(() => nextId++);
});

test('registers the fallback name on mount', () => {
  mount({ onScroll: holder() });
  expect(calls()).toEqual([['onScroll', 1]]);
});

test('registers the fallback name when a handler is added', () => {
  const { component, manager } = setup({});
  update(component, manager, { onScroll: holder() });
  expect(calls()).toEqual([['onScroll', 1]]);
});

test('registers the fallback name when a handler is replaced', () => {
  const oldRegistrationId = nextId;
  const { component, manager } = setup({ onScroll: holder() });
  update(component, manager, { onScroll: holder() });
  expect(unregister.mock.calls).toEqual([[oldRegistrationId]]);
  expect(calls()).toEqual([['onScroll', 1]]);
});

test('registers explicit event names when a handler is added', () => {
  const { component, manager } = setup({});
  update(component, manager, { onScroll: holder(['onScroll']) });
  expect(calls()).toEqual([['onScroll', 1]]);
});

test('registers the fallback name after host replacement', () => {
  const { component, manager } = setup({});
  const props = { onScroll: holder() };
  update(component, manager, props);
  const oldRegistrationId = register.mock.results[0].value;
  register.mockClear();
  (component._componentRef as { __nativeTag: number }).__nativeTag = 2;
  update(component, manager, props);
  expect(unregister.mock.calls).toEqual([[oldRegistrationId]]);
  expect(calls()).toEqual([['onScroll', 2]]);
});

test('keeps the fallback name when the handler is rebuilt', () => {
  const h = holder();
  setup({ onScroll: h });
  h.workletEventHandler.updateEventHandler(() => undefined, []);
  expect(calls()).toEqual([['onScroll', 1]]);
});

test('keeps a separate fallback name for each view through rebuilds', () => {
  const h = holder().workletEventHandler;
  h.registerForEvents(1, 'onScroll');
  h.registerForEvents(2, 'onMomentumScrollEnd');
  register.mockClear();
  h.updateEventHandler(() => undefined, []);
  expect(calls()).toEqual([
    ['onScroll', 1],
    ['onMomentumScrollEnd', 2],
  ]);
  h.unregisterFromEvents(1, 'onScroll');
  register.mockClear();
  h.updateEventHandler(() => undefined, []);
  expect(calls()).toEqual([['onMomentumScrollEnd', 2]]);
});

test('uses explicit event names and restores the fallback when they are removed', () => {
  const h = holder().workletEventHandler;
  h.registerForEvents(1, 'onScroll');
  register.mockClear();
  h.updateEventHandler(() => undefined, ['onMomentumScrollEnd']);
  expect(calls()).toEqual([['onMomentumScrollEnd', 1]]);
  register.mockClear();
  h.updateEventHandler(() => undefined, []);
  expect(calls()).toEqual([['onScroll', 1]]);
});

test('unregisters every prop of a shared handler on unmount', () => {
  const shared = holder();
  const { manager } = mount({
    onScroll: shared,
    onMomentumScrollEnd: shared,
  });
  const registrationIds = registeredIds();
  manager.detachEvents();
  expect(unregisteredIds()).toEqual(registrationIds);
});

test('re-registers every prop of a shared handler when it is rebuilt', () => {
  const shared = holder();
  mount({ onScroll: shared, onMomentumScrollEnd: shared });
  const registrationIds = registeredIds();
  register.mockClear();
  shared.workletEventHandler.updateEventHandler(() => undefined, []);
  expect(unregisteredIds()).toEqual(registrationIds);
  expect(calls()).toEqual([
    ['onScroll', 1],
    ['onMomentumScrollEnd', 1],
  ]);
});

test('keeps the other prop of a shared handler when one prop is removed', () => {
  const shared = holder();
  const { component, manager } = setup({
    onScroll: shared,
    onMomentumScrollEnd: shared,
  });
  update(component, manager, { onMomentumScrollEnd: shared });
  register.mockClear();
  shared.workletEventHandler.updateEventHandler(() => undefined, []);
  expect(calls()).toEqual([['onMomentumScrollEnd', 1]]);
});

function holder(eventNames: string[] = []) {
  return {
    workletEventHandler: new WorkletEventHandler(() => undefined, eventNames),
  };
}

function setup(props: Record<string, unknown>) {
  const mounted = mount(props);
  register.mockClear();
  return mounted;
}

function mount(props: Record<string, unknown>) {
  const component = {
    _componentRef: { __nativeTag: 1 },
    props,
    getComponentViewTag: () => 1,
  };
  const manager = new NativeEventsManager(component as never);
  manager.attachEvents();
  return { component, manager };
}

function update(
  component: { props: Record<string, unknown> },
  manager: NativeEventsManager,
  props: Record<string, unknown>
) {
  const prevProps = component.props;
  component.props = props;
  manager.updateEvents(prevProps);
}

function calls() {
  return register.mock.calls.map(([, name, tag]) => [name, tag]);
}

function registeredIds() {
  return register.mock.results.map(({ value }) => value as number).sort();
}

function unregisteredIds() {
  return unregister.mock.calls.map(([id]) => id as number).sort();
}
