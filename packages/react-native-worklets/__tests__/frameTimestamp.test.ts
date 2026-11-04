import { selectFrameTimestamp } from '../src/runLoop/uiRuntime/frameTimestamp';

describe('selectFrameTimestamp', () => {
  test('prefers the timestamp the frame flush is already using', () => {
    expect(selectFrameTimestamp(120, 100)).toBe(120);
  });

  test('uses the in-progress frame when nothing has overridden it', () => {
    expect(selectFrameTimestamp(undefined, 100)).toBe(100);
  });

  test('stays unset between frames', () => {
    expect(selectFrameTimestamp(undefined, undefined)).toBeUndefined();
  });

  test('does not treat zero as missing', () => {
    expect(selectFrameTimestamp(0, 100)).toBe(0);
    expect(selectFrameTimestamp(undefined, 0)).toBe(0);
  });
});
