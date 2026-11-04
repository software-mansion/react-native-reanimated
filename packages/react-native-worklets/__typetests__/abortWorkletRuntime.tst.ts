import { describe, expect, test } from 'tstyche';

import { abortWorkletRuntime, createWorkletRuntime } from '..';

describe('abortWorkletRuntime', () => {
  test('accepts a runtime id', () => {
    expect(abortWorkletRuntime).type.toBeCallableWith(1);
    expect(abortWorkletRuntime).type.toBeCallableWith(
      createWorkletRuntime({ abortable: true }).runtimeId
    );
  });

  test('rejects a runtime id that is not a number', () => {
    expect(abortWorkletRuntime).type.not.toBeCallableWith('1');
  });

  test('requires a runtime id', () => {
    expect(abortWorkletRuntime).type.not.toBeCallableWith();
  });

  test('returns whether the runtime exists', () => {
    expect(abortWorkletRuntime(1)).type.toBe<boolean>();
  });
});
