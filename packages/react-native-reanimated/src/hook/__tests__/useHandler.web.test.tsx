'use strict';

import { renderUseHandler, runCommonTests } from './useHandler.shared';

describe('useHandler (web)', () => {
  runCommonTests();

  describe('without babel plugin (non-worklet handlers)', () => {
    describe('with dependencies array', () => {
      test('is false when deps values are the same', () => {
        const handler = jest.fn();
        const { result, rerender } = renderUseHandler({ onScroll: handler }, [
          1,
          'hello',
        ]);

        rerender({ handlers: { onScroll: handler }, deps: [1, 'hello'] });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });

      test('is true when a primitive dep changes', () => {
        const handler = jest.fn();
        const { result, rerender } = renderUseHandler({ onScroll: handler }, [
          1,
        ]);

        rerender({ handlers: { onScroll: handler }, deps: [2] });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('is true when object reference changes even with same shape', () => {
        const handler = jest.fn();
        const obj = { value: 1 };
        const { result, rerender } = renderUseHandler({ onScroll: handler }, [
          obj,
        ]);

        rerender({ handlers: { onScroll: handler }, deps: [{ value: 1 }] });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('handlers are ignored for determining doDependenciesDiffer', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const deps = [42];

        const { result, rerender } = renderUseHandler(
          { onScroll: handler1 },
          deps
        );

        expect(result.current.doDependenciesDiffer).toBe(true);

        // Handler reference changes but deps stay the same
        rerender({ handlers: { onScroll: handler2 }, deps });
        expect(result.current.doDependenciesDiffer).toBe(false);

        // Handler keys change but deps stay the same
        rerender({ handlers: { onPress: handler1 }, deps });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });
    });

    describe('with empty dependencies array', () => {
      test('doDependenciesDiffer is always false', () => {
        const { result, rerender } = renderUseHandler(
          { onScroll: jest.fn() },
          []
        );

        expect(result.current.doDependenciesDiffer).toBe(false);

        rerender({ handlers: { onScroll: jest.fn() }, deps: [] });
        expect(result.current.doDependenciesDiffer).toBe(false);
      });
    });

    describe('with undefined dependencies', () => {
      test('doDependenciesDiffer is always true', () => {
        const handler = jest.fn();

        const { result, rerender } = renderUseHandler(
          { onScroll: handler },
          undefined
        );

        expect(result.current.doDependenciesDiffer).toBe(true);

        rerender({ handlers: { onScroll: handler } });
        expect(result.current.doDependenciesDiffer).toBe(true);

        rerender({ handlers: { onScroll: handler } });
        expect(result.current.doDependenciesDiffer).toBe(true);
      });
    });
  });
});
