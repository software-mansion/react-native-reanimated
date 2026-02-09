'use strict';
import { renderHook } from '@testing-library/react-native';

import { worklet } from '../../jestUtils';
import { useHandler } from '../useHandler';
import {
  createHandlers,
  createUseHandlerError,
  renderHookWithHandlers,
} from './useHandlerHelpers';

describe('useHandler (native)', () => {
  describe('valid cases', () => {
    describe('worklets without dependencies', () => {
      test('should indicate dependencies differ on initial render', () => {
        const { handlers } = createHandlers();

        const { result } = renderHook(() => useHandler(handlers));

        expect(result.current.doDependenciesDiffer).toBe(true);
        expect(result.current.useWeb).toBeDefined();
      });

      test('should indicate no change when re-rendering with same handlers object or worklet references', () => {
        const { worklets, handlers } = createHandlers();

        const { result, rerender } = renderHookWithHandlers(handlers);

        // Initial render
        expect(result.current.doDependenciesDiffer).toBe(true);

        // Re-render with same handlers object
        rerender({ handlers });
        expect(result.current.doDependenciesDiffer).toBe(false);

        // Re-render with new handlers object but same worklet references
        rerender({
          handlers: { onScroll: worklets.worklet1, onPress: worklets.worklet2 },
        });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });
    });

    describe('worklets with dependencies', () => {
      test('should indicate dependencies differ on initial render', () => {
        const { handlers } = createHandlers();
        const dependencies = ['someValue'];

        const { result } = renderHook(() => useHandler(handlers, dependencies));

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('should indicate change when handler is replaced', () => {
        const { worklets, handlers } = createHandlers();

        const { result, rerender } = renderHookWithHandlers(handlers);

        expect(result.current.doDependenciesDiffer).toBe(true);

        // Replace one handler with a new worklet
        const newWorklet1 = worklet();

        rerender({
          handlers: { onScroll: newWorklet1, onPress: worklets.worklet2 },
        });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('should indicate change when handler is added', () => {
        const { worklets } = createHandlers();
        const handlers = {
          onScroll: worklets.worklet1,
        };

        const { result, rerender } = renderHookWithHandlers(handlers);

        // Add a new handler
        rerender({
          handlers: { onScroll: worklets.worklet1, onPress: worklets.worklet2 },
        });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('should indicate change when handler is removed', () => {
        const { worklets, handlers } = createHandlers();

        const { result, rerender } = renderHookWithHandlers(handlers);

        // Remove a handler
        rerender({
          handlers: { onScroll: worklets.worklet1 },
        });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('should track dependency changes', () => {
        const { handlers } = createHandlers();
        const dependencies = ['value1'];

        const { result, rerender } = renderHookWithHandlers(
          handlers,
          dependencies
        );

        expect(result.current.doDependenciesDiffer).toBe(true);
        rerender({ handlers, deps: dependencies });
        expect(result.current.doDependenciesDiffer).toBe(false);
        rerender({ handlers, deps: ['value2'] });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });
    });
  });

  describe('invalid cases (native only allows worklets)', () => {
    test('should throw error when non-worklet function is passed without dependencies', () => {
      const regularHandler = jest.fn();
      const handlers = {
        onPress: regularHandler,
      };

      expect(() => {
        renderHook(() => useHandler(handlers));
      }).toThrow(createUseHandlerError('onPress', false));
    });

    test('should throw error when non-worklet function is passed with dependencies', () => {
      const regularHandler = jest.fn();
      const handlers = {
        onPress: regularHandler,
      };
      const dependencies = [regularHandler];

      // On native, even with dependencies, non-worklets are not allowed
      expect(() => {
        renderHook(() => useHandler(handlers, dependencies));
      }).toThrow(createUseHandlerError('onPress', false));
    });

    test('should throw error when mixed worklet and non-worklet functions are passed', () => {
      const workletHandler = worklet();
      const regularHandler = jest.fn();
      const handlers = {
        onScroll: workletHandler,
        onPress: regularHandler,
      };

      expect(() => {
        renderHook(() => useHandler(handlers));
      }).toThrow(createUseHandlerError('onPress', false));
    });

    test('should throw error when mixed worklet and non-worklet functions are passed with dependencies', () => {
      const workletHandler = worklet();
      const regularHandler = jest.fn();
      const handlers = {
        onScroll: workletHandler,
        onPress: regularHandler,
      };
      const dependencies = [regularHandler];

      // On native, even with dependencies, non-worklets are not allowed
      expect(() => {
        renderHook(() => useHandler(handlers, dependencies));
      }).toThrow(createUseHandlerError('onPress', false));
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
      }).toThrow(createUseHandlerError(['onScroll', 'onPress'], false));
    });
  });
});
