import { withSpring, withTiming } from '../src/animation';
import type {
  EntryAnimationsValues,
  LayoutAnimationValues,
} from '../src/commonTypes';
import { SharedTransition } from '../src/layoutReanimation';

jest.mock('../src/animation', () => ({
  ...jest.requireActual('../src/animation'),
  withSpring: jest.fn(() => ({})),
  withTiming: jest.fn(),
}));

describe('SharedTransition content fade builder', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([
    () => SharedTransition.duration(800).fadeContent(),
    () => SharedTransition.fadeContent().duration(800),
  ])(
    'keeps the builder and fade-in duration in either chain order',
    (create) => {
      const transition = create();
      expect(transition).toBeInstanceOf(SharedTransition);
      transition.buildContentFadeIn()?.({
        targetOpacity: 0.4,
      } as EntryAnimationsValues);
      expect(withTiming).toHaveBeenCalledWith(
        0.4,
        expect.objectContaining({ duration: 400 })
      );
    }
  );

  test('uses the default spring fade-in duration', () => {
    SharedTransition.springify().fadeContent().buildContentFadeIn()?.(
      {} as EntryAnimationsValues
    );
    expect(withTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 250 })
    );
  });

  test('clamps only the content-opacity spring', () => {
    const build = SharedTransition.duration(800)
      .springify()
      .dampingRatio(0.3)
      .fadeContent()
      .build();
    build({
      source: { width: 60, contentOpacity: 1 },
      target: { width: 150, contentOpacity: 0 },
    } as unknown as LayoutAnimationValues);
    expect(withSpring).toHaveBeenNthCalledWith(
      1,
      150,
      expect.not.objectContaining({ overshootClamping: true })
    );
    expect(withSpring).toHaveBeenNthCalledWith(
      2,
      0,
      expect.objectContaining({ overshootClamping: true, dampingRatio: 0.3 })
    );
  });
});
