'use strict';
import { ReanimatedError } from '../../../../../../../common';
import { convertNumberPropToNumber, ERROR_MESSAGES } from '../others';

describe(convertNumberPropToNumber, () => {
  it('returns number unchanged', () => {
    expect(convertNumberPropToNumber(10)).toBe(10);
  });

  it('converts percentage to number', () => {
    expect(convertNumberPropToNumber('10%')).toBe(0.1);
  });

  it('does not accept any other string', () => {
    expect(() => convertNumberPropToNumber('10px')).toThrow(
      new ReanimatedError(ERROR_MESSAGES.invalidValue('10px'))
    );
    expect(() => convertNumberPropToNumber('10')).toThrow(
      new ReanimatedError(ERROR_MESSAGES.invalidValue('10'))
    );
  });
});
