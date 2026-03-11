'use strict';

import { ReanimatedError } from '../../common';
import { worklet } from '../../jestUtils';
import { renderUseHandler, runCommonTests } from './useHandler.shared';

function nonWorkletError(...names: string[]) {
  return new ReanimatedError(
    `Passed handlers that are not worklets. Only worklet functions are allowed. Handlers "${names.join(', ')}" are not worklets.`
  );
}

describe('useHandler (native)', () => {
  runCommonTests();

  describe('non-worklet handlers', () => {
    test('throws when all handlers are non-worklets', () => {
      expect(() => {
        renderUseHandler({
          onScroll: jest.fn(),
          onPress: jest.fn(),
        });
      }).toThrow(nonWorkletError('onScroll', 'onPress'));
    });

    test('throws when a single non-worklet is mixed with worklets', () => {
      expect(() => {
        renderUseHandler({
          onScroll: worklet(),
          onPress: jest.fn(),
        });
      }).toThrow(nonWorkletError('onPress'));
    });

    test('throws on re-render when worklet is replaced with non-worklet', () => {
      const w = worklet();
      const { rerender } = renderUseHandler({ onScroll: w });

      expect(() => {
        rerender({ handlers: { onScroll: jest.fn() } });
      }).toThrow(nonWorkletError('onScroll'));
    });
  });

  describe('dependencies parameter is ignored', () => {
    test('doDependenciesDiffer is unaffected by changing deps', () => {
      const w = worklet();
      const { result, rerender } = renderUseHandler({ onScroll: w }, [1]);

      expect(result.current.doDependenciesDiffer).toBe(true);

      rerender({ handlers: { onScroll: w }, deps: [1] });
      expect(result.current.doDependenciesDiffer).toBe(false);

      // deps change but handler stays the same
      rerender({ handlers: { onScroll: w }, deps: [2] });
      expect(result.current.doDependenciesDiffer).toBe(false);

      // deps change to completely different values
      rerender({ handlers: { onScroll: w }, deps: ['a', 'b', 'c'] });
      expect(result.current.doDependenciesDiffer).toBe(false);
    });

    test('doDependenciesDiffer is unaffected by undefined deps', () => {
      const w = worklet();
      const { result, rerender } = renderUseHandler({ onScroll: w }, undefined);

      expect(result.current.doDependenciesDiffer).toBe(true);

      rerender({ handlers: { onScroll: w }, deps: undefined });
      expect(result.current.doDependenciesDiffer).toBe(false);

      // handler changes - true despite deps staying undefined
      rerender({ handlers: { onScroll: worklet() }, deps: undefined });
      expect(result.current.doDependenciesDiffer).toBe(true);
    });

    test('doDependenciesDiffer is unaffected by empty deps', () => {
      const w = worklet();
      const { result, rerender } = renderUseHandler({ onScroll: w }, []);

      expect(result.current.doDependenciesDiffer).toBe(true);

      rerender({ handlers: { onScroll: w }, deps: [] });
      expect(result.current.doDependenciesDiffer).toBe(false);

      // handler changes - true despite empty deps array
      rerender({ handlers: { onScroll: worklet() }, deps: [] });
      expect(result.current.doDependenciesDiffer).toBe(true);
    });
  });
});
