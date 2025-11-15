'use strict';
import { processPaddingHorizontal, processPaddingVertical } from '../paddings';

describe(processPaddingHorizontal, () => {
  test('returns parsed dimension for numeric values', () => {
    expect(processPaddingHorizontal(8)).toEqual({
      paddingLeft: '8px',
      paddingRight: '8px',
    });
  });

  test('returns parsed dimension for string values', () => {
    expect(processPaddingHorizontal('5%')).toEqual({
      paddingLeft: '5%',
      paddingRight: '5%',
    });
  });
});

describe(processPaddingVertical, () => {
  test('returns parsed dimension for numeric values', () => {
    expect(processPaddingVertical(6)).toEqual({
      paddingTop: '6px',
      paddingBottom: '6px',
    });
  });

  test('returns parsed dimension for string values', () => {
    expect(processPaddingVertical('4%')).toEqual({
      paddingTop: '4%',
      paddingBottom: '4%',
    });
  });
});
