import { withSpring, withTiming } from '../src/animation';
import { logger } from '../src/common';
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

function fadeInDuration(transition: SharedTransition) {
  jest.mocked(withTiming).mockClear();
  transition.buildContentFade()?.fadeIn({} as EntryAnimationsValues);
  return jest.mocked(withTiming).mock.lastCall?.[1]?.duration;
}

describe('SharedTransition.fadeContent', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'warnOnce').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([null, 'fast', []])(
    'warns and uses the defaults for the config %p',
    (config) => {
      const contentFade = SharedTransition.fadeContent(
        config as unknown as undefined
      ).buildContentFade();
      expect(contentFade?.fadeOutEnd).toBe(1);
      expect(logger.warnOnce).toHaveBeenCalledTimes(1);
    }
  );

  test.each(['fast', 42, [0.4]])(
    'warns and uses the default for the fadeOut options %p',
    (fadeOut) => {
      const contentFade = SharedTransition.fadeContent({
        fadeOut: fadeOut as unknown as { end: number },
      }).buildContentFade();
      expect(contentFade?.fadeOutEnd).toBe(1);
      expect(logger.warnOnce).toHaveBeenCalledTimes(1);
      expect(logger.warnOnce).toHaveBeenCalledWith(
        expect.stringContaining('fadeOut must be an object'),
        0
      );
    }
  );

  test.each(['fast', 42, [150]])(
    'warns and uses the default for the fadeIn options %p',
    (fadeIn) => {
      const transition = SharedTransition.duration(400).fadeContent({
        fadeIn: fadeIn as unknown as { duration: number },
      });
      expect(logger.warnOnce).toHaveBeenCalledTimes(1);
      expect(logger.warnOnce).toHaveBeenCalledWith(
        expect.stringContaining('fadeIn must be an object'),
        0
      );
      expect(fadeInDuration(transition)).toBe(200);
    }
  );

  test('has no content fade without fadeContent()', () => {
    expect(SharedTransition.duration(400).buildContentFade()).toBeUndefined();
  });

  test('fades out over the whole move by default', () => {
    const contentFade = SharedTransition.duration(400)
      .fadeContent()
      .buildContentFade();
    expect(contentFade?.fadeOutEnd).toBe(1);
    expect(logger.warnOnce).not.toHaveBeenCalled();
  });

  test('passes a valid fadeOut.end', () => {
    const contentFade = SharedTransition.fadeContent({
      fadeOut: { end: 0.4 },
    }).buildContentFade();
    expect(contentFade?.fadeOutEnd).toBe(0.4);
    expect(logger.warnOnce).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, Number.NaN, '0.5'])(
    'warns and uses the default for fadeOut.end %p',
    (end) => {
      const contentFade = SharedTransition.fadeContent({
        fadeOut: { end: end as number },
      }).buildContentFade();
      expect(contentFade?.fadeOutEnd).toBe(1);
      expect(logger.warnOnce).toHaveBeenCalledTimes(1);
    }
  );

  test('quotes a string value in the warning', () => {
    SharedTransition.fadeContent({
      fadeOut: { end: '0.5' as unknown as number },
    });
    expect(logger.warnOnce).toHaveBeenCalledWith(
      expect.stringContaining('got "0.5".'),
      0
    );
  });

  test.each([-1, Number.POSITIVE_INFINITY, Number.NaN, '200'])(
    'warns for fadeIn.duration %p',
    (duration) => {
      SharedTransition.fadeContent({
        fadeIn: { duration: duration as number },
      });
      expect(logger.warnOnce).toHaveBeenCalledTimes(1);
    }
  );

  test('accepts a fadeIn.duration of 0', () => {
    SharedTransition.fadeContent({ fadeIn: { duration: 0 } });
    expect(logger.warnOnce).not.toHaveBeenCalled();
  });

  test('fades in over half of the transition by default', () => {
    expect(fadeInDuration(SharedTransition.duration(400).fadeContent())).toBe(
      200
    );
  });

  test('fades in over a valid fadeIn.duration', () => {
    expect(
      fadeInDuration(
        SharedTransition.duration(400).fadeContent({
          fadeIn: { duration: 150 },
        })
      )
    ).toBe(150);
  });

  test.each([-1, Number.POSITIVE_INFINITY, Number.NaN, '200'])(
    'fades in over half of the transition for fadeIn.duration %p',
    (duration) => {
      expect(
        fadeInDuration(
          SharedTransition.duration(400).fadeContent({
            fadeIn: { duration: duration as number },
          })
        )
      ).toBe(200);
    }
  );
});

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
      transition.buildContentFade()?.fadeIn({
        targetOpacity: 0.4,
      } as EntryAnimationsValues);
      expect(withTiming).toHaveBeenCalledWith(
        0.4,
        expect.objectContaining({ duration: 400 })
      );
    }
  );

  test('uses the default spring fade-in duration', () => {
    SharedTransition.springify()
      .fadeContent()
      .buildContentFade()
      ?.fadeIn({} as EntryAnimationsValues);
    expect(withTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 250 })
    );
  });

  test('clamps only the content-opacity spring', () => {
    const build = SharedTransition.springify(800)
      .dampingRatio(0.3)
      .fadeContent()
      .build();
    build({
      currentWidth: 60,
      currentContentOpacity: 1,
      targetWidth: 150,
      targetContentOpacity: 0,
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
