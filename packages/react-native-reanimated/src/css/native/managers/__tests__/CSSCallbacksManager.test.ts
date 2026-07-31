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

  describe('mask', () => {
    test('starts empty', () => {
      expect(manager.getMask()).toBe(0);
    });

    test('reflects the provided callbacks', () => {
      manager.sync({ onAnimationEnd: jest.fn() });

      expect(manager.getMask()).toBe(CSS_EVENT_MASK.animationEnd);
    });

    test('drops the bit of a removed callback', () => {
      manager.sync({ onAnimationEnd: jest.fn(), onAnimationStart: jest.fn() });
      manager.sync({ onAnimationEnd: jest.fn() });

      expect(manager.getMask()).toBe(CSS_EVENT_MASK.animationEnd);
    });

    test('is empty again after detach', () => {
      manager.sync({ onAnimationEnd: jest.fn() });
      manager.detach();

      expect(manager.getMask()).toBe(0);
    });
  });

  describe('event delivery', () => {
    test('maps the native payload to the public animation event', () => {
      const onAnimationEnd = jest.fn();
      manager.sync({ onAnimationEnd });

      cssCallbacksRegistry.dispatch([
        event('animationEnd', { name: 'pulse', elapsedTime: 1.5 }),
      ]);

      expect(onAnimationEnd).toHaveBeenCalledWith({
        animationName: 'pulse',
        elapsedTime: 1.5,
      });
    });

    test('routes every animation event type to its own callback', () => {
      const callbacks = {
        onAnimationStart: jest.fn(),
        onAnimationEnd: jest.fn(),
        onAnimationIteration: jest.fn(),
        onAnimationCancel: jest.fn(),
      };
      manager.sync(callbacks);

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

    test('ignores transition events', () => {
      const onAnimationEnd = jest.fn();
      manager.sync({ onAnimationEnd });

      cssCallbacksRegistry.dispatch([event('transitionEnd')]);

      expect(onAnimationEnd).not.toHaveBeenCalled();
    });

    test('invokes the callback from the latest sync', () => {
      const first = jest.fn();
      const second = jest.fn();
      manager.sync({ onAnimationEnd: first });
      manager.sync({ onAnimationEnd: second });

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    test('stops delivering once the callback is removed', () => {
      const onAnimationEnd = jest.fn();
      manager.sync({ onAnimationEnd });
      manager.sync({});

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(onAnimationEnd).not.toHaveBeenCalled();
    });

    test('stops delivering after detach and resumes after a new sync', () => {
      const onAnimationEnd = jest.fn();
      manager.sync({ onAnimationEnd });
      manager.detach();

      cssCallbacksRegistry.dispatch([event('animationEnd')]);
      expect(onAnimationEnd).not.toHaveBeenCalled();

      manager.sync({ onAnimationEnd });
      cssCallbacksRegistry.dispatch([event('animationEnd')]);
      expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    });

    test('ignores events addressed to another view', () => {
      const onAnimationEnd = jest.fn();
      manager.sync({ onAnimationEnd });

      cssCallbacksRegistry.dispatch([event('animationEnd', { tag: 2 })]);

      expect(onAnimationEnd).not.toHaveBeenCalled();
    });
  });

  describe('registration', () => {
    test('adding a second callback does not duplicate delivery', () => {
      const onAnimationStart = jest.fn();

      manager.sync({ onAnimationStart });
      manager.sync({ onAnimationStart, onAnimationEnd: jest.fn() });

      cssCallbacksRegistry.dispatch([event('animationStart')]);

      expect(onAnimationStart).toHaveBeenCalledTimes(1);
    });

    test('unregisters when the last callback is removed', () => {
      const unregisterSpy = jest.spyOn(cssCallbacksRegistry, 'unregister');

      manager.sync({ onAnimationStart: jest.fn() });
      manager.sync({ onAnimationStart: undefined });

      expect(unregisterSpy).toHaveBeenCalledWith(VIEW_TAG, manager);

      unregisterSpy.mockRestore();
    });

    test('does not register a view that has no tag yet', () => {
      const registerSpy = jest.spyOn(cssCallbacksRegistry, 'register');
      const tagless = new CSSCallbacksManager(-1);

      const onAnimationEnd = jest.fn();
      tagless.sync({ onAnimationEnd });

      expect(registerSpy).not.toHaveBeenCalled();
      expect(tagless.getMask()).toBe(CSS_EVENT_MASK.animationEnd);

      cssCallbacksRegistry.dispatch([event('animationEnd', { tag: -1 })]);
      expect(onAnimationEnd).not.toHaveBeenCalled();

      registerSpy.mockRestore();
    });

    test('keeps nested components with the same tag independent', () => {
      const outer = jest.fn();
      const inner = jest.fn();
      const otherManager = new CSSCallbacksManager(VIEW_TAG);

      manager.sync({ onAnimationEnd: outer });
      otherManager.sync({ onAnimationEnd: inner });
      manager.detach();

      cssCallbacksRegistry.dispatch([event('animationEnd')]);

      expect(outer).not.toHaveBeenCalled();
      expect(inner).toHaveBeenCalledTimes(1);
    });
  });
});
