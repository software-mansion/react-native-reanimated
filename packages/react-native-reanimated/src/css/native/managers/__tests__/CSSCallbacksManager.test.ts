'use strict';
import type { CSSEventType, NativeCSSEvent } from '../../events';
import { CSS_EVENT_MASK, cssCallbacksRegistry } from '../../events';
import CSSCallbacksManager from '../CSSCallbacksManager';

const VIEW_TAG = 1;

const event = (
  type: CSSEventType,
  overrides: Partial<NativeCSSEvent> = {}
): NativeCSSEvent => ({
  tag: VIEW_TAG,
  type,
  name: 'fadeIn',
  elapsedTime: 0.25,
  ...overrides,
});

describe('CSSCallbacksManager', () => {
  let manager: CSSCallbacksManager;

  beforeEach(() => {
    cssCallbacksRegistry.clear();
    manager = new CSSCallbacksManager(VIEW_TAG);
  });

  describe('masks', () => {
    test('each kind reflects its own callbacks', () => {
      manager.syncAnimationCallbacks({ onCSSAnimationEnd: jest.fn() });
      manager.syncTransitionCallbacks({ onCSSTransitionStart: jest.fn() });

      expect(manager.getAnimationEventMask()).toBe(CSS_EVENT_MASK.animationEnd);
      expect(manager.getTransitionEventMask()).toBe(
        CSS_EVENT_MASK.transitionStart
      );
    });

    test('drops the bit of a removed callback', () => {
      manager.syncAnimationCallbacks({
        onCSSAnimationEnd: jest.fn(),
        onCSSAnimationStart: jest.fn(),
      });
      manager.syncAnimationCallbacks({ onCSSAnimationEnd: jest.fn() });

      expect(manager.getAnimationEventMask()).toBe(CSS_EVENT_MASK.animationEnd);
    });

    test('are empty again after detach', () => {
      manager.syncAnimationCallbacks({ onCSSAnimationEnd: jest.fn() });
      manager.syncTransitionCallbacks({ onCSSTransitionEnd: jest.fn() });
      manager.detach();

      expect(manager.getAnimationEventMask()).toBe(0);
      expect(manager.getTransitionEventMask()).toBe(0);
    });
  });

  describe('event delivery', () => {
    test('maps the native payload to the public animation event', () => {
      const onCSSAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onCSSAnimationEnd });

      cssCallbacksRegistry.dispatch([
        event('animationEnd', { name: 'pulse', elapsedTime: 1.5 }),
      ]);

      expect(onCSSAnimationEnd).toHaveBeenCalledWith({
        animationName: 'pulse',
        elapsedTime: 1.5,
      });
    });

    test('maps the native payload to the public transition event', () => {
      const onCSSTransitionEnd = jest.fn();
      manager.syncTransitionCallbacks({ onCSSTransitionEnd });

      cssCallbacksRegistry.dispatch([
        event('transitionEnd', { name: 'opacity', elapsedTime: 0.3 }),
      ]);

      expect(onCSSTransitionEnd).toHaveBeenCalledWith({
        propertyName: 'opacity',
        elapsedTime: 0.3,
      });
    });

    test('routes every animation event type to its own callback', () => {
      const callbacks = {
        onCSSAnimationStart: jest.fn(),
        onCSSAnimationEnd: jest.fn(),
        onCSSAnimationIteration: jest.fn(),
        onCSSAnimationCancel: jest.fn(),
      };
      manager.syncAnimationCallbacks(callbacks);

      cssCallbacksRegistry.dispatch([
        event('animationStart'),
        event('animationEnd'),
        event('animationIteration'),
        event('animationCancel'),
      ]);

      expect(callbacks.onCSSAnimationStart).toHaveBeenCalledTimes(1);
      expect(callbacks.onCSSAnimationEnd).toHaveBeenCalledTimes(1);
      expect(callbacks.onCSSAnimationIteration).toHaveBeenCalledTimes(1);
      expect(callbacks.onCSSAnimationCancel).toHaveBeenCalledTimes(1);
    });

    test('routes every transition event type to its own callback', () => {
      const callbacks = {
        onCSSTransitionRun: jest.fn(),
        onCSSTransitionStart: jest.fn(),
        onCSSTransitionEnd: jest.fn(),
        onCSSTransitionCancel: jest.fn(),
      };
      manager.syncTransitionCallbacks(callbacks);

      cssCallbacksRegistry.dispatch([
        event('transitionRun'),
        event('transitionStart'),
        event('transitionEnd'),
        event('transitionCancel'),
      ]);

      expect(callbacks.onCSSTransitionRun).toHaveBeenCalledTimes(1);
      expect(callbacks.onCSSTransitionStart).toHaveBeenCalledTimes(1);
      expect(callbacks.onCSSTransitionEnd).toHaveBeenCalledTimes(1);
      expect(callbacks.onCSSTransitionCancel).toHaveBeenCalledTimes(1);
    });

    test('a transition event does not reach animation callbacks', () => {
      const onCSSAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onCSSAnimationEnd });

      cssCallbacksRegistry.dispatch([event('transitionEnd')]);

      expect(onCSSAnimationEnd).not.toHaveBeenCalled();
    });

    test('invokes the callback from the latest sync', () => {
      const first = jest.fn();
      const second = jest.fn();
      manager.syncAnimationCallbacks({ onCSSAnimationEnd: first });
      manager.syncAnimationCallbacks({ onCSSAnimationEnd: second });

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    test('stops delivering once the callback is removed', () => {
      const onCSSAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onCSSAnimationEnd });
      manager.syncAnimationCallbacks({});

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(onCSSAnimationEnd).not.toHaveBeenCalled();
    });

    test('stops delivering after detach and resumes after a new sync', () => {
      const onCSSAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onCSSAnimationEnd });
      manager.detach();

      cssCallbacksRegistry.dispatch([event('animationEnd')]);
      expect(onCSSAnimationEnd).not.toHaveBeenCalled();

      manager.syncAnimationCallbacks({ onCSSAnimationEnd });
      cssCallbacksRegistry.dispatch([event('animationEnd')]);
      expect(onCSSAnimationEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('registration', () => {
    test('adding a second callback does not duplicate delivery', () => {
      const onCSSAnimationStart = jest.fn();

      manager.syncAnimationCallbacks({ onCSSAnimationStart });
      manager.syncAnimationCallbacks({
        onCSSAnimationStart,
        onCSSAnimationEnd: jest.fn(),
      });

      cssCallbacksRegistry.dispatch([event('animationStart')]);

      expect(onCSSAnimationStart).toHaveBeenCalledTimes(1);
    });

    test('stays registered while either kind still has callbacks', () => {
      const onCSSTransitionEnd = jest.fn();
      manager.syncAnimationCallbacks({ onCSSAnimationEnd: jest.fn() });
      manager.syncTransitionCallbacks({ onCSSTransitionEnd });

      manager.syncAnimationCallbacks({});
      cssCallbacksRegistry.dispatch([event('transitionEnd')]);

      expect(onCSSTransitionEnd).toHaveBeenCalledTimes(1);
    });

    test('does not register a view that has no tag yet', () => {
      const registerSpy = jest.spyOn(cssCallbacksRegistry, 'register');
      const tagless = new CSSCallbacksManager(-1);

      const onCSSAnimationEnd = jest.fn();
      tagless.syncAnimationCallbacks({ onCSSAnimationEnd });

      expect(registerSpy).not.toHaveBeenCalled();
      expect(tagless.getAnimationEventMask()).toBe(CSS_EVENT_MASK.animationEnd);

      cssCallbacksRegistry.dispatch([event('animationEnd', { tag: -1 })]);
      expect(onCSSAnimationEnd).not.toHaveBeenCalled();

      registerSpy.mockRestore();
    });

    test('keeps nested components with the same tag independent', () => {
      const outer = jest.fn();
      const inner = jest.fn();
      const otherManager = new CSSCallbacksManager(VIEW_TAG);

      manager.syncAnimationCallbacks({ onCSSAnimationEnd: outer });
      otherManager.syncAnimationCallbacks({ onCSSAnimationEnd: inner });
      manager.detach();

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(outer).not.toHaveBeenCalled();
      expect(inner).toHaveBeenCalledTimes(1);
    });
  });
});
