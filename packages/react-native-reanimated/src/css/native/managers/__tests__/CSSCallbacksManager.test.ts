'use strict';
import { NO_VIEW_TAG } from '../../../../common';
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
    test('start empty', () => {
      expect(manager.getAnimationEventMask()).toBe(0);
      expect(manager.getTransitionEventMask()).toBe(0);
    });

    test('each kind reflects its own callbacks', () => {
      manager.syncAnimationCallbacks({ onAnimationEnd: jest.fn() });
      manager.syncTransitionCallbacks({ onTransitionStart: jest.fn() });

      expect(manager.getAnimationEventMask()).toBe(CSS_EVENT_MASK.animationEnd);
      expect(manager.getTransitionEventMask()).toBe(
        CSS_EVENT_MASK.transitionStart
      );
    });

    test('drops the bit of a removed callback', () => {
      manager.syncAnimationCallbacks({
        onAnimationEnd: jest.fn(),
        onAnimationStart: jest.fn(),
      });
      manager.syncAnimationCallbacks({ onAnimationEnd: jest.fn() });

      expect(manager.getAnimationEventMask()).toBe(CSS_EVENT_MASK.animationEnd);
    });

    test('are empty again after detach', () => {
      manager.syncAnimationCallbacks({ onAnimationEnd: jest.fn() });
      manager.syncTransitionCallbacks({ onTransitionEnd: jest.fn() });
      manager.detach();

      expect(manager.getAnimationEventMask()).toBe(0);
      expect(manager.getTransitionEventMask()).toBe(0);
    });
  });

  describe('event delivery', () => {
    test('maps the native payload to the public animation event', () => {
      const onAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onAnimationEnd });

      cssCallbacksRegistry.dispatch([
        event('animationEnd', { name: 'pulse', elapsedTime: 1.5 }),
      ]);

      expect(onAnimationEnd).toHaveBeenCalledWith({
        animationName: 'pulse',
        elapsedTime: 1.5,
      });
    });

    test('maps the native payload to the public transition event', () => {
      const onTransitionEnd = jest.fn();
      manager.syncTransitionCallbacks({ onTransitionEnd });

      cssCallbacksRegistry.dispatch([
        event('transitionEnd', { name: 'opacity', elapsedTime: 0.3 }),
      ]);

      expect(onTransitionEnd).toHaveBeenCalledWith({
        propertyName: 'opacity',
        elapsedTime: 0.3,
      });
    });

    test('routes every animation event type to its own callback', () => {
      const callbacks = {
        onAnimationStart: jest.fn(),
        onAnimationEnd: jest.fn(),
        onAnimationIteration: jest.fn(),
        onAnimationCancel: jest.fn(),
      };
      manager.syncAnimationCallbacks(callbacks);

      cssCallbacksRegistry.dispatch([
        event('animationStart'),
        event('animationEnd'),
        event('animationIteration'),
        event('animationCancel'),
      ]);

      expect(callbacks.onAnimationStart).toHaveBeenCalledTimes(1);
      expect(callbacks.onAnimationEnd).toHaveBeenCalledTimes(1);
      expect(callbacks.onAnimationIteration).toHaveBeenCalledTimes(1);
      expect(callbacks.onAnimationCancel).toHaveBeenCalledTimes(1);
    });

    test('routes every transition event type to its own callback', () => {
      const callbacks = {
        onTransitionRun: jest.fn(),
        onTransitionStart: jest.fn(),
        onTransitionEnd: jest.fn(),
        onTransitionCancel: jest.fn(),
      };
      manager.syncTransitionCallbacks(callbacks);

      cssCallbacksRegistry.dispatch([
        event('transitionRun'),
        event('transitionStart'),
        event('transitionEnd'),
        event('transitionCancel'),
      ]);

      expect(callbacks.onTransitionRun).toHaveBeenCalledTimes(1);
      expect(callbacks.onTransitionStart).toHaveBeenCalledTimes(1);
      expect(callbacks.onTransitionEnd).toHaveBeenCalledTimes(1);
      expect(callbacks.onTransitionCancel).toHaveBeenCalledTimes(1);
    });

    test('a transition event does not reach animation callbacks', () => {
      const onAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onAnimationEnd });

      cssCallbacksRegistry.dispatch([event('transitionEnd')]);

      expect(onAnimationEnd).not.toHaveBeenCalled();
    });

    test('invokes the callback from the latest sync', () => {
      const first = jest.fn();
      const second = jest.fn();
      manager.syncAnimationCallbacks({ onAnimationEnd: first });
      manager.syncAnimationCallbacks({ onAnimationEnd: second });

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    test('stops delivering once the callback is removed', () => {
      const onAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onAnimationEnd });
      manager.syncAnimationCallbacks({});

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(onAnimationEnd).not.toHaveBeenCalled();
    });

    test('stops delivering after detach and resumes after a new sync', () => {
      const onAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onAnimationEnd });
      manager.detach();

      cssCallbacksRegistry.dispatch([event('animationEnd')]);
      expect(onAnimationEnd).not.toHaveBeenCalled();

      manager.syncAnimationCallbacks({ onAnimationEnd });
      cssCallbacksRegistry.dispatch([event('animationEnd')]);
      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    });

    test('ignores events addressed to another view', () => {
      const onAnimationEnd = jest.fn();
      manager.syncAnimationCallbacks({ onAnimationEnd });

      cssCallbacksRegistry.dispatch([event('animationEnd', { tag: 2 })]);

      expect(onAnimationEnd).not.toHaveBeenCalled();
    });
  });

  describe('registration', () => {
    test('adding a second callback does not duplicate delivery', () => {
      const onAnimationStart = jest.fn();

      manager.syncAnimationCallbacks({ onAnimationStart });
      manager.syncAnimationCallbacks({
        onAnimationStart,
        onAnimationEnd: jest.fn(),
      });

      cssCallbacksRegistry.dispatch([event('animationStart')]);

      expect(onAnimationStart).toHaveBeenCalledTimes(1);
    });

    test('stays registered while either kind still has callbacks', () => {
      const onTransitionEnd = jest.fn();
      manager.syncAnimationCallbacks({ onAnimationEnd: jest.fn() });
      manager.syncTransitionCallbacks({ onTransitionEnd });

      manager.syncAnimationCallbacks({});
      cssCallbacksRegistry.dispatch([event('transitionEnd')]);

      expect(onTransitionEnd).toHaveBeenCalledTimes(1);
    });

    test('unregisters when the last callback of both kinds is removed', () => {
      const unregisterSpy = jest.spyOn(cssCallbacksRegistry, 'unregister');

      manager.syncAnimationCallbacks({ onAnimationStart: jest.fn() });
      manager.syncTransitionCallbacks({ onTransitionEnd: jest.fn() });
      manager.syncAnimationCallbacks({});
      manager.syncTransitionCallbacks({});

      expect(unregisterSpy).toHaveBeenCalledWith(VIEW_TAG, manager);

      unregisterSpy.mockRestore();
    });

    test('does not register a view that has no tag yet', () => {
      const registerSpy = jest.spyOn(cssCallbacksRegistry, 'register');
      const tagless = new CSSCallbacksManager(NO_VIEW_TAG);

      const onAnimationEnd = jest.fn();
      tagless.syncAnimationCallbacks({ onAnimationEnd });

      expect(registerSpy).not.toHaveBeenCalled();
      expect(tagless.getAnimationEventMask()).toBe(CSS_EVENT_MASK.animationEnd);

      cssCallbacksRegistry.dispatch([
        event('animationEnd', { tag: NO_VIEW_TAG }),
      ]);
      expect(onAnimationEnd).not.toHaveBeenCalled();

      registerSpy.mockRestore();
    });

    test('keeps nested components with the same tag independent', () => {
      const outer = jest.fn();
      const inner = jest.fn();
      const otherManager = new CSSCallbacksManager(VIEW_TAG);

      manager.syncAnimationCallbacks({ onAnimationEnd: outer });
      otherManager.syncAnimationCallbacks({ onAnimationEnd: inner });
      manager.detach();

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(outer).not.toHaveBeenCalled();
      expect(inner).toHaveBeenCalledTimes(1);
    });
  });
});
