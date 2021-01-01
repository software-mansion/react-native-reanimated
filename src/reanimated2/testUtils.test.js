import './globals';
import { createWorkletMock } from './testUtils';

describe('Test utils', () => {
  describe('createWorkletMock', () => {
    it('creates valid worklet', () => {
      const worklet = createWorkletMock(function() {});

      expect(worklet).toEqual(
        expect.objectContaining({
          __location: expect.any(String),
          __worklet: true,
          __workletHash: expect.any(Number),
          _closure: expect.any(Object),
          asString: expect.any(String),
        })
      );
    });

    it('worklet hash is stable', () => {
      const callback = function() {};

      const workletA = createWorkletMock(callback);
      const workletB = createWorkletMock(callback);

      expect(workletA.__workletHash).toEqual(workletB.__workletHash);
    });
  });
});
