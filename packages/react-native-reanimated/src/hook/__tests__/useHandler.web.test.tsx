'use strict';
import { renderHook } from '@testing-library/react-native';

import { logger } from '../../common';
import { worklet } from '../../jestUtils';
import { useHandler } from '../useHandler';
import { renderHookWithHandlers } from './useHandlerHelpers';

jest.mock('../../common', () => {
  const originalModule = jest.requireActual('../../common');
  return {
    ...originalModule,
    logger: {
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('useHandler (web)', () => {
  describe('valid cases', () => {
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

      test('should indicate change when re-rendering with different dependency references', () => {
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

      test('should indicate change when re-rendering with different dependency reference', () => {
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

      test('should indicate change when re-rendering with different dependencies', () => {
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

      // On first render, savedDependencies is initialized to [], so empty array []
      // matches and doDependenciesDiffer is false
      expect(result.current.doDependenciesDiffer).toBe(false);
    });
  });

  describe('non-worklets without dependencies (web warnings and re-renders)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should warn and indicate dependencies differ when non-worklet handler is passed without dependencies', () => {
      const regularHandler = jest.fn();
      const handlers = {
        onPress: regularHandler,
      };

      const { result } = renderHook(() => useHandler(handlers));

      expect(logger.warn).toHaveBeenCalledWith(
        'Non-worklet handlers ("onPress") were passed without a dependency array. This will cause the hook to update on every render. Please provide a dependency array or use only worklet functions instead.'
      );
      expect(result.current.doDependenciesDiffer).toBe(true);
    });

    test('should warn and indicate dependencies differ on every render', () => {
      const regularHandler = jest.fn();
      const handlers = {
        onPress: regularHandler,
      };

      const { result, rerender } = renderHookWithHandlers(handlers);

      expect(result.current.doDependenciesDiffer).toBe(true);
      expect(logger.warn).toHaveBeenCalledTimes(1);

      rerender({ handlers });
      expect(result.current.doDependenciesDiffer).toBe(true);
      expect(logger.warn).toHaveBeenCalledTimes(2);

      rerender({ handlers });
      expect(result.current.doDependenciesDiffer).toBe(true);
      expect(logger.warn).toHaveBeenCalledTimes(3);
    });

    test('should warn when multiple non-worklet handlers are passed without dependencies', () => {
      const regularHandler1 = jest.fn();
      const regularHandler2 = jest.fn();
      const handlers = {
        onScroll: regularHandler1,
        onPress: regularHandler2,
      };

      const { result } = renderHook(() => useHandler(handlers));

      expect(logger.warn).toHaveBeenCalledWith(
        'Non-worklet handlers ("onScroll, onPress") were passed without a dependency array. This will cause the hook to update on every render. Please provide a dependency array or use only worklet functions instead.'
      );
      expect(result.current.doDependenciesDiffer).toBe(true);
    });

    test('should warn and indicate dependencies differ on re-render when handlers change from valid to ones without dependencies', () => {
      const workletHandler = worklet();
      const regularHandler = jest.fn();
      const validHandlers = {
        onScroll: workletHandler,
      };
      const invalidHandlers = {
        onScroll: workletHandler,
        onPress: regularHandler,
      };

      const { result, rerender } = renderHookWithHandlers(validHandlers);

      expect(result.current.doDependenciesDiffer).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();

      rerender({ handlers: invalidHandlers });
      expect(logger.warn).toHaveBeenCalledWith(
        'Non-worklet handlers ("onPress") were passed without a dependency array. This will cause the hook to update on every render. Please provide a dependency array or use only worklet functions instead.'
      );
      expect(result.current.doDependenciesDiffer).toBe(true);
    });

    test('should NOT warn or indicate frequent change when empty array is provided as dependencies', () => {
      const regularHandler = jest.fn();
      const handlers = {
        onPress: regularHandler,
      };
      const dependencies: unknown[] = [];

      const { result, rerender } = renderHookWithHandlers(
        handlers,
        dependencies
      );

      expect(logger.warn).not.toHaveBeenCalled();
      // On first render, savedDependencies is [], so it matches and doDependenciesDiffer is false
      expect(result.current.doDependenciesDiffer).toBe(false);

      rerender({ handlers, deps: dependencies });
      expect(logger.warn).not.toHaveBeenCalled();
      expect(result.current.doDependenciesDiffer).toBe(false);
    });
  });
});
