import { logger } from '../src/common';
import { SharedTransition } from '../src/layoutReanimation';

describe('SharedTransition.fadeContent', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('has no content fade without fadeContent()', () => {
    expect(SharedTransition.duration(400).buildContentFade()).toBeUndefined();
  });

  test('fades out over the whole move by default', () => {
    const contentFade = SharedTransition.duration(400)
      .fadeContent()
      .buildContentFade();
    expect(contentFade?.fadeOutEnd).toBe(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('passes a valid fadeOut.end', () => {
    const contentFade = SharedTransition.fadeContent({
      fadeOut: { end: 0.4 },
    }).buildContentFade();
    expect(contentFade?.fadeOutEnd).toBe(0.4);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, Number.NaN, '0.5'])(
    'warns and uses the default for fadeOut.end %p',
    (end) => {
      const contentFade = SharedTransition.fadeContent({
        fadeOut: { end: end as number },
      }).buildContentFade();
      expect(contentFade?.fadeOutEnd).toBe(1);
      expect(logger.warn).toHaveBeenCalledTimes(1);
    }
  );

  test.each([-1, Number.POSITIVE_INFINITY, Number.NaN, '200'])(
    'warns for fadeIn.duration %p',
    (duration) => {
      SharedTransition.fadeContent({
        fadeIn: { duration: duration as number },
      });
      expect(logger.warn).toHaveBeenCalledTimes(1);
    }
  );

  test('accepts a fadeIn.duration of 0', () => {
    SharedTransition.fadeContent({ fadeIn: { duration: 0 } });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
