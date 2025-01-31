import { processBoxShadow } from '../shadows';

describe(processBoxShadow, () => {
  describe('returns a correct number of shadows', () => {
    it('returns a correct number of shadows', () => {
      expect(processBoxShadow('0 0 10px 0 red, 0 0 20px 0 blue')).toEqual([
        {
          offsetX: 0,
          offsetY: 0,
          blurRadius: 10,
          color: 'red',
        },
      ]);
    });
  });
});
