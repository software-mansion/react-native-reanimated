'use strict';
import { ANIMATION_NAME_PREFIX } from '../../../constants';
import type { CSSAnimationEventType } from '../CSSEventHandlersRegistry';
import cssEventHandlersRegistry from '../CSSEventHandlersRegistry';

const animationName = (id: number) => `${ANIMATION_NAME_PREFIX}${id}`;

function animationEvent(
  viewTag: number,
  type: CSSAnimationEventType,
  elapsedTime: number,
  nameId = 0
) {
  return {
    viewTag,
    type,
    animationName: animationName(nameId),
    elapsedTime,
  };
}

describe('CSSEventHandlersRegistry', () => {
  const viewTag1 = 1;
  const viewTag2 = 2;

  beforeEach(() => {
    cssEventHandlersRegistry.clear();
  });

  describe('addListener', () => {
    test('registers a handler for a view and event type', () => {
      const handler = jest.fn();
      cssEventHandlersRegistry.addListener(viewTag1, 'animationstart', handler);

      const event = animationEvent(viewTag1, 'animationstart', 0);
      cssEventHandlersRegistry.handleEvents([event]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    test('replaces existing handler for the same view and event type', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      cssEventHandlersRegistry.addListener(viewTag1, 'animationend', handler1);
      cssEventHandlersRegistry.addListener(viewTag1, 'animationend', handler2);

      const event = animationEvent(viewTag1, 'animationend', 1);
      cssEventHandlersRegistry.handleEvents([event]);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    test('supports multiple event types for the same view', () => {
      const startHandler = jest.fn();
      const endHandler = jest.fn();
      cssEventHandlersRegistry.addListener(
        viewTag1,
        'animationstart',
        startHandler
      );
      cssEventHandlersRegistry.addListener(
        viewTag1,
        'animationend',
        endHandler
      );

      const startEvent = animationEvent(viewTag1, 'animationstart', 0);
      const endEvent = animationEvent(viewTag1, 'animationend', 1);
      cssEventHandlersRegistry.handleEvents([startEvent, endEvent]);

      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(startHandler).toHaveBeenCalledWith(startEvent);
      expect(endHandler).toHaveBeenCalledTimes(1);
      expect(endHandler).toHaveBeenCalledWith(endEvent);
    });

    test('supports handlers for different views', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      cssEventHandlersRegistry.addListener(
        viewTag1,
        'animationstart',
        handler1
      );
      cssEventHandlersRegistry.addListener(
        viewTag2,
        'animationstart',
        handler2
      );

      const event = animationEvent(viewTag1, 'animationstart', 0);
      cssEventHandlersRegistry.handleEvents([event]);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('removeListener', () => {
    test('stops the handler from being called', () => {
      const handler = jest.fn();
      cssEventHandlersRegistry.addListener(viewTag1, 'animationstart', handler);
      cssEventHandlersRegistry.removeListener(viewTag1, 'animationstart');

      cssEventHandlersRegistry.handleEvents([
        animationEvent(viewTag1, 'animationstart', 0),
      ]);

      expect(handler).not.toHaveBeenCalled();
    });

    test('does not throw for non-existent view', () => {
      expect(() => {
        cssEventHandlersRegistry.removeListener(999, 'animationstart');
      }).not.toThrow();
    });
  });

  describe('handleEvents', () => {
    test('ignores events for views with no handlers', () => {
      const handler = jest.fn();
      cssEventHandlersRegistry.addListener(viewTag1, 'animationstart', handler);

      cssEventHandlersRegistry.handleEvents([
        animationEvent(viewTag2, 'animationstart', 0),
      ]);

      expect(handler).not.toHaveBeenCalled();
    });

    test('ignores events for unregistered event types', () => {
      const handler = jest.fn();
      cssEventHandlersRegistry.addListener(viewTag1, 'animationstart', handler);

      cssEventHandlersRegistry.handleEvents([
        animationEvent(viewTag1, 'animationend', 1),
      ]);

      expect(handler).not.toHaveBeenCalled();
    });

    test('dispatches multiple events in batch order', () => {
      const calls: string[] = [];
      const startHandler = () => calls.push('start');
      const iterationHandler = () => calls.push('iteration');
      const endHandler = () => calls.push('end');

      cssEventHandlersRegistry.addListener(
        viewTag1,
        'animationstart',
        startHandler
      );
      cssEventHandlersRegistry.addListener(
        viewTag1,
        'animationiteration',
        iterationHandler
      );
      cssEventHandlersRegistry.addListener(
        viewTag1,
        'animationend',
        endHandler
      );

      cssEventHandlersRegistry.handleEvents([
        animationEvent(viewTag1, 'animationstart', 0),
        animationEvent(viewTag1, 'animationiteration', 1),
        animationEvent(viewTag1, 'animationend', 2),
      ]);

      expect(calls).toEqual(['start', 'iteration', 'end']);
    });
  });
});
