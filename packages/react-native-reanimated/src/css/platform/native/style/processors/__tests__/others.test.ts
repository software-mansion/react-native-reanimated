import { ERROR_MESSAGES, processAspectRatio } from '../others';
import { ReanimatedError } from '../../../../../errors';

describe(processAspectRatio, () => {
  it('returns number as is', () => {
    expect(processAspectRatio(1.5)).toEqual(1.5);
  });

  it('normalizes aspect ratio', () => {
    expect(processAspectRatio('16/9')).toEqual(16 / 9);
  });

  it('throws an error for invalid aspect ratio', () => {
    expect(() => processAspectRatio('invalid')).toThrow(
      new ReanimatedError(ERROR_MESSAGES.unsupportedAspectRatio('invalid'))
    );
  });
});
