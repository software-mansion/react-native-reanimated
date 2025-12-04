'use strict';
import type { ShadowNodeWrapper } from '../../../../commonTypes';
import type { CSSTransitionProperties } from '../../../types';
import { normalizeCSSTransitionProperties } from '../../normalization';
import {
  registerCSSTransition,
  unregisterCSSTransition,
  updateCSSTransition,
} from '../../proxy';
import CSSTransitionsManager from '../CSSTransitionsManager';

jest.mock('../../proxy.ts', () => ({
  registerCSSTransition: jest.fn(),
  unregisterCSSTransition: jest.fn(),
  updateCSSTransition: jest.fn(),
}));

describe('CSSTransitionsManager', () => {
  let manager: CSSTransitionsManager;
  const viewTag = 1;
  const shadowNodeWrapper = {} as ShadowNodeWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CSSTransitionsManager(shadowNodeWrapper, viewTag);
  });

  describe('update', () => {
    const initialStyle = { opacity: 0 };

    describe('attaching transition', () => {
      test('registers native transition only after tracked style property changes', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
          transitionDuration: '200ms',
        };
        const nextStyle = { opacity: 0.5 };

        manager.update(transitionProperties, initialStyle);
        expect(registerCSSTransition).not.toHaveBeenCalled();

        manager.update(transitionProperties, nextStyle);

        const normalizedConfig =
          normalizeCSSTransitionProperties(transitionProperties);

        expect(registerCSSTransition).toHaveBeenCalledWith(shadowNodeWrapper, {
          properties: { opacity: [0, 0.5] },
          settings: normalizedConfig?.settings ?? {},
        });
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });
    });

    describe('updating transition', () => {
      test("doesn't send native updates when style and settings remain unchanged", () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
          transitionDuration: '150ms',
        };
        const secondStyle = { opacity: 0.4 };

        manager.update(transitionProperties, initialStyle);
        manager.update(transitionProperties, secondStyle);
        expect(registerCSSTransition).toHaveBeenCalledTimes(1);
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();

        jest.clearAllMocks();

        manager.update(transitionProperties, secondStyle);
        expect(registerCSSTransition).not.toHaveBeenCalled();
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });

      test('does not invoke native updates when only settings or unrelated props change', () => {
        const baseTransition: CSSTransitionProperties = {
          transitionProperty: 'opacity',
          transitionDuration: '180ms',
        };
        const changedStyle = { opacity: 0.6 };

        manager.update(baseTransition, initialStyle);
        manager.update(baseTransition, changedStyle);

        jest.clearAllMocks();

        const settingsOnlyUpdate: CSSTransitionProperties = {
          transitionProperty: 'opacity',
          transitionDuration: '220ms',
        };

        manager.update(settingsOnlyUpdate, changedStyle);
        expect(registerCSSTransition).not.toHaveBeenCalled();
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();

        const unrelatedStyleChange = {
          opacity: 0.6,
          transform: 'scale(1.1)',
        };

        manager.update(baseTransition, unrelatedStyleChange);
        expect(registerCSSTransition).not.toHaveBeenCalled();
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });

      test('updates native transition when tracked style property changes with new settings', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
          transitionDuration: '100ms',
        };
        const updatedTransitionConfig: CSSTransitionProperties = {
          transitionProperty: 'opacity',
          transitionDuration: '200ms',
        };
        const secondStyle = { opacity: 0.25 };
        const thirdStyle = { opacity: 0.75 };

        manager.update(transitionProperties, initialStyle);
        manager.update(transitionProperties, secondStyle);

        jest.clearAllMocks();

        manager.update(updatedTransitionConfig, thirdStyle);
        expect(registerCSSTransition).not.toHaveBeenCalled();
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).toHaveBeenCalledWith(viewTag, {
          properties: { opacity: [0.25, 0.75] },
          settings: { opacity: { duration: 200 } },
        });
      });

      test('removes transitioned properties immediately when transitionProperty no longer includes them', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: ['opacity', 'transform'],
          transitionDuration: '150ms',
        };
        const initialTransitionStyle = {
          opacity: 0,
          transform: 'scale(1)',
        };
        const updatedStyle = {
          opacity: 1,
          transform: 'scale(1.1)',
        };

        manager.update(transitionProperties, initialTransitionStyle);
        manager.update(transitionProperties, updatedStyle);

        expect(registerCSSTransition).toHaveBeenCalledTimes(1);

        jest.clearAllMocks();

        const narrowedTransition: CSSTransitionProperties = {
          transitionProperty: 'transform',
          transitionDuration: '150ms',
        };

        manager.update(narrowedTransition, updatedStyle);

        expect(registerCSSTransition).not.toHaveBeenCalled();
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).toHaveBeenCalledWith(
          viewTag,
          expect.objectContaining({
            properties: { opacity: null },
          })
        );
      });

      test('removes properties when previous config tracked all properties and new config is narrower', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'all',
          transitionDuration: '120ms',
        };
        const initialTransitionStyle = {
          opacity: 0,
          transform: 'scale(1)',
        };
        const updatedStyle = {
          opacity: 0.4,
          transform: 'scale(1.1)',
        };

        manager.update(transitionProperties, initialTransitionStyle);
        manager.update(transitionProperties, updatedStyle);

        jest.clearAllMocks();

        const narrowedConfig: CSSTransitionProperties = {
          transitionProperty: 'transform',
          transitionDuration: '120ms',
        };

        manager.update(narrowedConfig, updatedStyle);

        expect(registerCSSTransition).not.toHaveBeenCalled();
        expect(unregisterCSSTransition).not.toHaveBeenCalled();
        expect(updateCSSTransition).toHaveBeenCalledWith(
          viewTag,
          expect.objectContaining({
            properties: { opacity: null },
          })
        );
      });

      test('sends combined diff when style changes and property is removed in the same update', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: ['opacity', 'transform'],
          transitionDuration: '160ms',
        };
        const firstStyle = {
          opacity: 0.2,
          transform: 'scale(1)',
        };
        const secondStyle = {
          opacity: 0.5,
          transform: 'scale(1.2)',
        };

        manager.update(transitionProperties, firstStyle);
        manager.update(transitionProperties, secondStyle);

        jest.clearAllMocks();

        const narrowedConfig: CSSTransitionProperties = {
          transitionProperty: 'transform',
          transitionDuration: '160ms',
        };
        const thirdStyle = {
          opacity: 0.7,
          transform: 'scale(1.4)',
        };

        manager.update(narrowedConfig, thirdStyle);

        expect(updateCSSTransition).toHaveBeenCalledWith(
          viewTag,
          expect.objectContaining({
            properties: {
              opacity: null,
              transform: ['scale(1.2)', 'scale(1.4)'],
            },
          })
        );
      });
    });

    describe('detaching transition', () => {
      test('unregisters native transition when config is cleared even if there are no style changes', () => {
        const transitionProperties: CSSTransitionProperties = {
          transitionProperty: 'opacity',
          transitionDuration: '80ms',
        };
        const secondStyle = { opacity: 0.6 };

        manager.update(transitionProperties, initialStyle);
        manager.update(transitionProperties, secondStyle);

        jest.clearAllMocks();

        manager.update(null, secondStyle);
        expect(registerCSSTransition).not.toHaveBeenCalled();
        expect(unregisterCSSTransition).toHaveBeenCalledWith(viewTag);
        expect(updateCSSTransition).not.toHaveBeenCalled();
      });
    });

    test("doesn't call detach if there is no existing transition", () => {
      manager.update(null, null);
      expect(registerCSSTransition).not.toHaveBeenCalled();
      expect(unregisterCSSTransition).not.toHaveBeenCalled();
      expect(updateCSSTransition).not.toHaveBeenCalled();
    });
  });
});
