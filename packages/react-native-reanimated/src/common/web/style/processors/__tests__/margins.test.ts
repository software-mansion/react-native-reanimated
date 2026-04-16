'use strict';
import { processMarginHorizontal, processMarginVertical } from '../margins';

describe(processMarginHorizontal, () => {
  test('returns parsed dimension for numeric values', () => {
    expect(processMarginHorizontal(10)).toEqual({
      marginLeft: '10px',
      marginRight: '10px',
    });
  });

  test('returns parsed dimension for string values', () => {
    expect(processMarginHorizontal('5%')).toEqual({
      marginLeft: '5%',
      marginRight: '5%',
    });
  });
});

describe(processMarginVertical, () => {
  test('returns parsed dimension for numeric values', () => {
    expect(processMarginVertical(12)).toEqual({
      marginTop: '12px',
      marginBottom: '12px',
    });
  });

  test('returns parsed dimension for string values', () => {
    expect(processMarginVertical('10%')).toEqual({
      marginTop: '10%',
      marginBottom: '10%',
    });
  });
});
