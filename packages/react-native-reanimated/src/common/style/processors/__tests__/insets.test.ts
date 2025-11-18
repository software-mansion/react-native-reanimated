'use strict';
import { processInset, processInsetBlock, processInsetInline } from '../insets';

const insetValue = 10;

describe(processInset, () => {
  test('applies value to all sides', () => {
    expect(processInset(insetValue)).toEqual({
      top: insetValue,
      bottom: insetValue,
      left: insetValue,
      right: insetValue,
    });
  });
});

describe(processInsetBlock, () => {
  test('applies value to vertical sides', () => {
    expect(processInsetBlock(insetValue)).toEqual({
      top: insetValue,
      bottom: insetValue,
    });
  });
});

describe(processInsetInline, () => {
  test('applies value to horizontal sides', () => {
    expect(processInsetInline(insetValue)).toEqual({
      left: insetValue,
      right: insetValue,
    });
  });
});
