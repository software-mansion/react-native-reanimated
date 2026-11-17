'use strict';
import { processVectorEffect } from '../vectorEffect';

describe(processVectorEffect, () => {
  test('maps the RN value to the CSS keyword', () => {
    expect(processVectorEffect('nonScalingStroke')).toBe('non-scaling-stroke');
  });

  test('passes through valid CSS values', () => {
    expect(processVectorEffect('none')).toBe('none');
    expect(processVectorEffect('non-scaling-stroke')).toBe(
      'non-scaling-stroke'
    );
    expect(processVectorEffect('inherit')).toBe('inherit');
  });

  test('passes through an inherited object key as a string', () => {
    expect(processVectorEffect('toString')).toBe('toString');
  });

  test('maps `default` to none', () => {
    expect(processVectorEffect('default')).toBe('none');
  });
});
