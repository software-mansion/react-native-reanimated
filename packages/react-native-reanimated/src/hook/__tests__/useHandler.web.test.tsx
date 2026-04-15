'use strict';

import { useIsFastRefresh } from '../utils';
import { renderUseHandler, runCommonTests } from './useHandler.shared';

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  useIsFastRefresh: jest.fn(() => false),
}));

const mockFastRefresh = useIsFastRefresh as jest.Mock;

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

  describe('fast refresh', () => {
    describe('without babel plugin', () => {
      const fastRefreshCases: Array<{
        caseName: string;
        initialDeps: number[] | undefined;
        nextDeps: number[] | undefined;
        expected: [boolean, boolean, boolean, boolean];
      }> = [
        {
          caseName: 'undefined deps',
          initialDeps: undefined,
          nextDeps: undefined,
          expected: [true, true, true, true],
        },
        {
          caseName: 'empty deps array',
          initialDeps: [],
          nextDeps: [],
          expected: [false, false, true, false],
        },
        {
          caseName: 'non-empty deps array',
          initialDeps: [1],
          nextDeps: [1],
          expected: [true, false, true, false],
        },
        {
          caseName: 'changing deps between renders',
          initialDeps: [1],
          nextDeps: [2],
          expected: [true, true, true, false],
        },
      ];

      fastRefreshCases.forEach(
        ({
          caseName,
          initialDeps,
          nextDeps,
          expected: [
            firstRenderValue,
            secondRenderValue,
            fastRefreshValue,
            postRefreshValue,
          ],
        }) => {
          test(`handles fast-refresh behavior for ${caseName}`, () => {
            const handler = jest.fn();
            const { result, rerender } = renderUseHandler(
              { onScroll: handler },
              initialDeps
            );

            // Initial render.
            expect(result.current.doDependenciesDiffer).toBe(firstRenderValue);

            // Second render can keep deps stable or change them.
            rerender({ handlers: { onScroll: handler }, deps: nextDeps });
            expect(result.current.doDependenciesDiffer).toBe(secondRenderValue);

            // Fast refresh render.
            mockFastRefresh.mockReturnValueOnce(true);
            rerender({ handlers: { onScroll: handler }, deps: nextDeps });
            expect(result.current.doDependenciesDiffer).toBe(fastRefreshValue);

            // Post-fast-refresh render.
            rerender({ handlers: { onScroll: handler }, deps: nextDeps });
            expect(result.current.doDependenciesDiffer).toBe(postRefreshValue);
          });
        }
      );

      test('first-mount `[]` spec is still preserved (no false positive)', () => {
        // Guard against false positives on initial mount with [] deps.
        const { result } = renderUseHandler({ onScroll: jest.fn() }, []);
        expect(result.current.doDependenciesDiffer).toBe(false);
      });
    });
  });
});
