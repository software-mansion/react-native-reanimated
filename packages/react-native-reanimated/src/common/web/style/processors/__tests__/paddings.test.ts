'use strict';
import { processPaddingHorizontal, processPaddingVertical } from '../paddings';

describe(processPaddingHorizontal, () => {
  test('returns parsed dimension for both horizontal paddings', () => {
    expect(processPaddingHorizontal(8)).toEqual({
      paddingLeft: '8px',
      paddingRight: '8px',
    });
  });
});

describe(processPaddingVertical, () => {
  test('returns parsed dimension for both vertical paddings', () => {
    expect(processPaddingVertical('2em')).toEqual({
      paddingTop: '2em',
      paddingBottom: '2em',
    });
  });
});
