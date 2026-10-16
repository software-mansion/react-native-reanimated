import AnimatedComponent from '../src/createAnimatedComponent/AnimatedComponent.native';
import type {
  AnimatedComponentProps,
  InitialComponentProps,
  ManagedAnimatedComponent,
} from '../src/createAnimatedComponent/commonTypes';
import { NativeEventsManager } from '../src/createAnimatedComponent/NativeEventsManager';
import { WorkletEventHandler } from '../src/WorkletEventHandler';

jest.mock('../src/WorkletEventHandler', () => ({
  WorkletEventHandler: class {
    registerForEvents = jest.fn();
    unregisterFromEvents = jest.fn();
  },
}));

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: () => false,
}));

type TestComponent = {
  _componentRef: { __nativeTag: number } | null;
  props: AnimatedComponentProps<InitialComponentProps>;
  getComponentViewTag: () => number;
};

describe('NativeEventsManager', () => {
  test('moves events from the host-binding callback without an outer update', () => {
    const { component, handler, manager } = setup();
    component._componentRef = { __nativeTag: 2 };
    const animatedComponent = Object.assign(component, {
      _NativeEventsManager: manager,
      _configureLayoutAnimation: jest.fn(),
      _configureSharedTransition: jest.fn(),
      _updateAnimatedStylesAndProps: jest.fn(),
      _InlinePropManager: { attachInlineProps: jest.fn() },
      _getViewInfo: () => ({ viewTag: 2 }),
    });

    AnimatedComponent.prototype._attachHostBindings.call(
      animatedComponent as unknown as AnimatedComponent
    );

    expect(handler.unregisterFromEvents).toHaveBeenCalledWith(1);
    expect(handler.registerForEvents).toHaveBeenLastCalledWith(2, 'onScroll');
  });

  test('moves events when only the host changes', () => {
    const { component, handler, manager } = setup();

    component._componentRef = { __nativeTag: 2 };
    manager.updateEvents();

    expect(handler.unregisterFromEvents).toHaveBeenCalledWith(1);
    expect(handler.registerForEvents).toHaveBeenLastCalledWith(2, 'onScroll');
  });

  test('removes the registered handler when the host and handler change', () => {
    const { component, handler, manager } = setup();
    const nextHandler = makeHandler();

    component._componentRef = { __nativeTag: 2 };
    component.props = { onScroll: { workletEventHandler: nextHandler } };
    manager.updateEvents();

    expect(handler.unregisterFromEvents).toHaveBeenCalledWith(1);
    expect(nextHandler.registerForEvents).toHaveBeenCalledWith(2, 'onScroll');
  });

  test('does not register events twice when both update paths run', () => {
    const { component, handler, manager } = setup();
    const nextHandler = makeHandler();

    component._componentRef = { __nativeTag: 2 };
    component.props = { onScroll: { workletEventHandler: nextHandler } };
    manager.updateEvents();
    manager.updateEvents();

    expect(handler.unregisterFromEvents).toHaveBeenCalledTimes(1);
    expect(nextHandler.registerForEvents).toHaveBeenCalledTimes(1);
  });

  test('updates handlers without a host replacement', () => {
    const { component, handler, manager } = setup();
    const nextHandler = makeHandler();

    component.props = { onScroll: { workletEventHandler: nextHandler } };
    manager.updateEvents();

    expect(handler.unregisterFromEvents).toHaveBeenCalledWith(1);
    expect(nextHandler.registerForEvents).toHaveBeenCalledWith(1);

    component.props = {};
    manager.updateEvents();
    expect(nextHandler.unregisterFromEvents).toHaveBeenCalledWith(1);
  });

  test('detaches registered handlers if props change before unmount', () => {
    const { component, handler, manager } = setup();

    component.props = {};
    manager.detachEvents();

    expect(handler.unregisterFromEvents).toHaveBeenCalledWith(1);
  });

  test('waits for a valid host before attaching events', () => {
    const { component, handler, manager } = setup(-1);

    expect(handler.registerForEvents).not.toHaveBeenCalled();

    component._componentRef = { __nativeTag: 2 };
    manager.updateEvents();

    expect(handler.registerForEvents).toHaveBeenCalledTimes(1);
    expect(handler.registerForEvents).toHaveBeenCalledWith(2, 'onScroll');
  });

  test('does not register added or replaced handlers without a host', () => {
    const { component, handler, manager } = setup();
    component._componentRef = null;
    manager.updateEvents();

    expect(handler.unregisterFromEvents).toHaveBeenCalledWith(1);
    expect(handler.registerForEvents).toHaveBeenCalledTimes(1);

    const nextHandler = makeHandler();
    const addedHandler = makeHandler();
    component.props = {
      onScroll: { workletEventHandler: nextHandler },
      onMomentumScrollEnd: { workletEventHandler: addedHandler },
    };
    manager.updateEvents();
    manager.updateEvents();

    expect(nextHandler.registerForEvents).not.toHaveBeenCalled();
    expect(addedHandler.registerForEvents).not.toHaveBeenCalled();

    component._componentRef = { __nativeTag: 2 };
    manager.updateEvents();

    expect(nextHandler.registerForEvents).toHaveBeenCalledTimes(1);
    expect(nextHandler.registerForEvents).toHaveBeenCalledWith(2, 'onScroll');
    expect(addedHandler.registerForEvents).toHaveBeenCalledTimes(1);
    expect(addedHandler.registerForEvents).toHaveBeenCalledWith(
      2,
      'onMomentumScrollEnd'
    );
    manager.detachEvents();
    expect(nextHandler.unregisterFromEvents).toHaveBeenLastCalledWith(2);
    expect(addedHandler.unregisterFromEvents).toHaveBeenLastCalledWith(2);
  });
});

function setup(viewTag = 1) {
  const handler = makeHandler();
  const component: TestComponent = {
    _componentRef: { __nativeTag: viewTag },
    props: { onScroll: { workletEventHandler: handler } },
    getComponentViewTag() {
      return this._componentRef?.__nativeTag ?? -1;
    },
  };
  const manager = new NativeEventsManager(
    component as unknown as ManagedAnimatedComponent
  );
  manager.attachEvents();

  return { component, handler, manager };
}

function makeHandler() {
  return new WorkletEventHandler(() => undefined, ['onScroll']);
}
