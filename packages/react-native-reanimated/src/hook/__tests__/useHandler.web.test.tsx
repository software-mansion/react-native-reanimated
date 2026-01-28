'use strict';
import { renderHook } from '@testing-library/react-native';

import { worklet } from '../../jestUtils';
import { useHandler } from '../useHandler';
import {
  createHandlers,
  createUseHandlerError,
  renderHookWithHandlers,
} from './useHandler.common';

describe('useHandler (web)', () => {
  describe('valid cases', () => {
    describe('worklets without dependencies', () => {
      test('should indicate dependencies differ on initial render', () => {
        const { handlers } = createHandlers();

        const { result } = renderHook(() => useHandler(handlers));

        expect(result.current.doDependenciesDiffer).toBe(true);
        expect(result.current.useWeb).toBeDefined();
      });

      test('should indicate no change when re-rendering with same handlers', () => {
        const { handlers } = createHandlers();

        const { result, rerender } = renderHookWithHandlers(handlers);

        rerender({ handlers, deps: undefined });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });
    });

    describe('non-worklets with dependencies (all handlers in deps)', () => {
      test('should indicate dependencies differ on initial render', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = [handler1, handler2];

        const { result } = renderHook(() => useHandler(handlers, dependencies));

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('should indicate no change when re-rendering with same dependencies', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = [handler1, handler2];

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });

      test('should indicate change when re-rendering with different handler references', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = [handler1, handler2];

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);

        const newHandler1 = jest.fn();
        rerender({ handlers, deps: [newHandler1, handler2] });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });
    });

    describe('non-worklets with dependencies (some handlers in deps)', () => {
      test('should indicate dependencies differ on initial render', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = [handler1]; // Only handler1 in deps

        const { result } = renderHook(() => useHandler(handlers, dependencies));

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('should indicate no change when re-rendering with same dependencies', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = [handler1]; // Only handler1 in deps

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });

      test('should indicate change when re-rendering with different handler reference', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = [handler1]; // Only handler1 in deps

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);

        const newHandler1 = jest.fn();
        rerender({ handlers, deps: [newHandler1] });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });
    });

    describe('non-worklets with dependencies (no handlers in deps)', () => {
      test('should indicate dependencies differ on initial render', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = ['someOtherValue', 42]; // No handlers in deps

        const { result } = renderHook(() => useHandler(handlers, dependencies));

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('should indicate no change when re-rendering with same dependencies', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = ['someOtherValue', 42]; // No handlers in deps

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });

      test('should indicate change when re-rendering with different dependency values', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const handlers = {
          onScroll: handler1,
          onPress: handler2,
        };
        const dependencies = ['someOtherValue', 42]; // No handlers in deps

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);

        rerender({ handlers, deps: ['newValue', 100] });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });
    });

    describe('mixed worklet and non-worklet functions with dependencies', () => {
      test('should indicate dependencies differ on initial render', () => {
        const workletHandler = worklet();
        const regularHandler = jest.fn();
        const handlers = {
          onScroll: workletHandler,
          onPress: regularHandler,
        };
        const dependencies = [regularHandler];

        const { result } = renderHook(() => useHandler(handlers, dependencies));

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('should indicate no change when re-rendering with same dependencies', () => {
        const workletHandler = worklet();
        const regularHandler = jest.fn();
        const handlers = {
          onScroll: workletHandler,
          onPress: regularHandler,
        };
        const dependencies = [regularHandler];

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });

      test('should indicate change when re-rendering with different handler reference', () => {
        const workletHandler = worklet();
        const regularHandler = jest.fn();
        const handlers = {
          onScroll: workletHandler,
          onPress: regularHandler,
        };
        const dependencies = [regularHandler];

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);

        const newRegularHandler = jest.fn();
        rerender({ handlers, deps: [newRegularHandler] });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });
    });

    test('should work with empty array as dependencies', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handlers = {
        onScroll: handler1,
        onPress: handler2,
      };
      const dependencies: unknown[] = [];

      const { result } = renderHook(() => useHandler(handlers, dependencies));

      expect(result.current).toHaveProperty('doDependenciesDiffer');
      // Empty array is still valid dependencies, should not throw
      // On first render, savedDependencies is [], so empty array [] matches and doDependenciesDiffer is false
      expect(result.current.doDependenciesDiffer).toBe(false);
    });
  });

  describe('invalid cases (web requires dependencies for non-worklets)', () => {
    test('should throw error when at least one non-worklet function and no dependencies (undefined)', () => {
      const workletHandler = worklet();
      const regularHandler = jest.fn();
      const handlers = {
        onScroll: workletHandler,
        onPress: regularHandler,
      };

      expect(() => {
        renderHook(() => useHandler(handlers, undefined));
      }).toThrow(createUseHandlerError('onPress', true));
    });

    test('should throw error when at least one non-worklet function and dependencies not passed', () => {
      const regularHandler = jest.fn();
      const handlers = {
        onPress: regularHandler,
      };

      expect(() => {
        renderHook(() => useHandler(handlers));
      }).toThrow(createUseHandlerError('onPress', true));
    });

    test('should throw error with handler names in error message (multiple handlers)', () => {
      const regularHandler1 = jest.fn();
      const regularHandler2 = jest.fn();
      const handlers = {
        onScroll: regularHandler1,
        onPress: regularHandler2,
      };

      expect(() => {
        renderHook(() => useHandler(handlers));
      }).toThrow(createUseHandlerError(['onScroll', 'onPress'], true));
    });

    test('should NOT throw error when empty array is provided as dependencies', () => {
      const regularHandler = jest.fn();
      const handlers = {
        onPress: regularHandler,
      };
      const dependencies: unknown[] = [];

      // Empty array is still valid dependencies, should not throw
      expect(() => {
        renderHook(() => useHandler(handlers, dependencies));
      }).not.toThrow();
    });
  });
});
