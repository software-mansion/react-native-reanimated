import { describe, expect, test } from 'tstyche';

import { withDecay } from '..';

describe('withDecay', () => {
  test('requires a config argument', () => {
    expect(withDecay).type.not.toBeCallableWith();
    expect(withDecay).type.toBeCallableWith({});
  });

  test('rubberBandEffect=true makes clamp required', () => {
    expect(withDecay).type.not.toBeCallableWith({ rubberBandEffect: true });
    expect(withDecay).type.toBeCallableWith({
      rubberBandEffect: true,
      clamp: [0, 1],
    });
  });

  test('rubberBandEffect=false leaves clamp optional', () => {
    expect(withDecay).type.toBeCallableWith({ rubberBandEffect: false });
  });

  test('clamp must be a two-element tuple', () => {
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: true,
      clamp: [0],
    });
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: true,
      clamp: [0, 1, 2],
    });
  });

  test('rubberBandFactor requires rubberBandEffect to be enabled', () => {
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: false,
      rubberBandFactor: 3,
    });
    expect(withDecay).type.not.toBeCallableWith({ rubberBandFactor: 3 });
    expect(withDecay).type.toBeCallableWith({
      rubberBandEffect: true,
      clamp: [0, 1],
      rubberBandFactor: 3,
    });
  });

  test('a non-literal boolean rubberBandEffect still requires clamp', () => {
    const rubberBandOn: boolean = Math.random() < 0.5;
    expect(withDecay).type.not.toBeCallableWith({
      rubberBandEffect: rubberBandOn,
    });
    expect(withDecay).type.toBeCallableWith({
      rubberBandEffect: rubberBandOn,
      clamp: [0, 1],
    });
  });
});
