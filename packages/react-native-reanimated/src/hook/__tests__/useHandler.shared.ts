'use strict';

import { Platform } from 'react-native';

import { cloneWorklet, worklet } from '../../jestUtils';
import type { DependencyList } from '../commonTypes';
import { useHandler } from '../useHandler';

type Handlers = Parameters<typeof useHandler>[0];

interface RenderProps {
  handlers: Handlers;
  deps?: DependencyList;
}

const { renderHook } =
  Platform.OS === 'web'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@testing-library/react')
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@testing-library/react-native');

export function renderUseHandler(handlers: Handlers, deps?: DependencyList) {
  return renderHook(
    ({ handlers: h, deps: d }: RenderProps) => useHandler(h, d),
    { initialProps: { handlers, deps } as RenderProps }
  );
}

export function runCommonTests() {
  describe('context', () => {
    test('preserves the same mutable context object across re-renders', () => {
      const { result, rerender } = renderUseHandler({
        onScroll: worklet(),
        onPress: worklet(),
      });

      const { context } = result.current;
      context.value = 42;

      rerender({ handlers: { onScroll: worklet() } });

      expect(result.current.context).toBe(context);
      expect(result.current.context.value).toBe(42);
    });
  });

  describe('doDependenciesDiffer (worklet handlers)', () => {
    test('is true on initial render', () => {
      const { result } = renderUseHandler({ onScroll: worklet() });

      expect(result.current.doDependenciesDiffer).toBe(true);
    });

    describe('is true', () => {
      test('when a new handler is added', () => {
        const w = worklet();
        const { result, rerender } = renderUseHandler({ onScroll: w });

        rerender({ handlers: { onScroll: w, onPress: worklet() } });

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('when a handler is removed', () => {
        const w1 = worklet();
        const w2 = worklet();
        const { result, rerender } = renderUseHandler({
          onScroll: w1,
          onPress: w2,
        });

        rerender({ handlers: { onScroll: w1 } });

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('when a handler key is replaced', () => {
        const w = worklet();
        const { result, rerender } = renderUseHandler({ onScroll: w });

        rerender({ handlers: { onDrag: w } });

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test('when worklet hash changes', () => {
        const w = worklet();
        w.__closure = { x: 1 };
        const { result, rerender } = renderUseHandler({ onScroll: w });

        const w2 = worklet();
        w2.__closure = { x: 1 };
        rerender({ handlers: { onScroll: w2 } });

        expect(result.current.doDependenciesDiffer).toBe(true);
      });

      test.each([
        {
          name: 'closure keys change',
          before: { a: 1, b: 2 },
          after: { a: 1, c: 3 },
        },
        {
          name: 'closure has additional keys',
          before: { x: 1 },
          after: { x: 1, y: 2 },
        },
        {
          name: 'closure values change (same keys)',
          before: { x: 1 },
          after: { x: 2 },
        },
        {
          name: 'closure value references differ (same shape, different object)',
          before: { ref: { nested: true } },
          after: { ref: { nested: true } },
        },
      ])('when $name for same hash', ({ before, after }) => {
        const w = worklet();
        w.__closure = before;
        const { result, rerender } = renderUseHandler({ onScroll: w });

        const w2 = cloneWorklet(w);
        w2.__closure = after;
        rerender({ handlers: { onScroll: w2 } });

        expect(result.current.doDependenciesDiffer).toBe(true);
      });
    });

    describe('is false', () => {
      test('when re-rendering with unmodified handlers object', () => {
        const handlers = { onScroll: worklet() };
        const { result, rerender } = renderUseHandler(handlers);

        expect(result.current.doDependenciesDiffer).toBe(true);

        rerender({ handlers });

        expect(result.current.doDependenciesDiffer).toBe(false);
      });

      test('when handler object reference changes but worklets have same hash and closure', () => {
        const w1 = worklet();
        w1.__closure = { x: 1 };
        const w2 = worklet();
        w2.__closure = { y: 'hello' };

        const { result, rerender } = renderUseHandler({
          onScroll: w1,
          onPress: w2,
        });

        expect(result.current.doDependenciesDiffer).toBe(true);

        rerender({
          handlers: {
            onScroll: cloneWorklet(w1),
            onPress: cloneWorklet(w2),
          },
        });

        expect(result.current.doDependenciesDiffer).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    test('handles empty handlers object', () => {
      const { result } = renderUseHandler({});

      expect(result.current.doDependenciesDiffer).toBe(true);
      expect(result.current.context).toBeDefined();
    });

    test('empty handlers object does not differ on re-render', () => {
      const { result, rerender } = renderUseHandler({});

      expect(result.current.doDependenciesDiffer).toBe(true);

      rerender({ handlers: {} });

      expect(result.current.doDependenciesDiffer).toBe(false);
    });
  });

  describe('return value', () => {
    test('should not return useWeb', () => {
      const { result } = renderUseHandler({ onScroll: worklet() });

      expect(result.current).not.toHaveProperty('useWeb');
    });

    test('should return context and doDependenciesDiffer', () => {
      const { result } = renderUseHandler({ onScroll: worklet() });

      expect(result.current).toHaveProperty('context');
      expect(result.current).toHaveProperty('doDependenciesDiffer');
    });
  });
}
