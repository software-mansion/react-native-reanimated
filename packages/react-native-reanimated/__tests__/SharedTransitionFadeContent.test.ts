import { withTiming } from '../src/animation';
import { logger } from '../src/common';
import type { EntryAnimationsValues } from '../src/commonTypes';
import { SharedTransition } from '../src/layoutReanimation';

jest.mock('../src/animation', () => ({
  ...jest.requireActual('../src/animation'),
  withTiming: jest.fn(),
}));

function fadeInDuration(transition: SharedTransition) {
  transition.buildContentFade()?.fadeIn({} as EntryAnimationsValues);
  return jest.mocked(withTiming).mock.lastCall?.[1]?.duration;
}

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
