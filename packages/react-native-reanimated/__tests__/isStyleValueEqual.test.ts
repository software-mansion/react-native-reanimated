import { isStyleValueEqual } from '../src/hook/utils';

describe('isStyleValueEqual', () => {
  it('compares primitives with ===', () => {
    expect(isStyleValueEqual(1, 1)).toBe(true);
    expect(isStyleValueEqual('red', 'red')).toBe(true);
    expect(isStyleValueEqual(1, 2)).toBe(false);
    expect(isStyleValueEqual(0, '0')).toBe(false);
    expect(isStyleValueEqual(undefined, null)).toBe(false);
    expect(isStyleValueEqual(NaN, NaN)).toBe(false);
  });

  it('compares transforms by contents', () => {
    expect(
      isStyleValueEqual(
        [{ translateY: -265 }, { scale: 1 }],
        [{ translateY: -265 }, { scale: 1 }]
      )
    ).toBe(true);
    expect(
      isStyleValueEqual([{ translateY: -265 }], [{ translateY: -264 }])
    ).toBe(false);
    expect(isStyleValueEqual([{ scale: 1 }], [{ scaleX: 1 }])).toBe(false);
    expect(
      isStyleValueEqual([{ scale: 1 }], [{ scale: 1 }, { rotate: '0deg' }])
    ).toBe(false);
    expect(
      isStyleValueEqual(
        [{ matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }],
        [{ matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }]
      )
    ).toBe(true);
  });

  it('compares plain objects by contents', () => {
    expect(
      isStyleValueEqual({ width: 0, height: 2 }, { width: 0, height: 2 })
    ).toBe(true);
    expect(
      isStyleValueEqual({ width: 0, height: 2 }, { width: 0, height: 3 })
    ).toBe(false);
    expect(isStyleValueEqual({ a: undefined }, { b: undefined })).toBe(false);
  });

  it('does not treat arrays and objects with the same keys as equal', () => {
    expect(isStyleValueEqual([1], { 0: 1 })).toBe(false);
  });

  it('treats deeply nested values as different', () => {
    const nested = () => ({ a: { b: { c: { d: { e: 1 } } } } });
    expect(isStyleValueEqual(nested(), nested())).toBe(false);
  });

  it('terminates on cyclic objects', () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    const b: Record<string, unknown> = {};
    b.self = b;
    expect(isStyleValueEqual(a, b)).toBe(false);
  });
});
