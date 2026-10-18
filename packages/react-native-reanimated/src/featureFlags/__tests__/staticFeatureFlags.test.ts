'use strict';
import { logger } from '../../common';
import { ReanimatedModule } from '../../ReanimatedModule';
import { getStaticFeatureFlag } from '../index';
import { DefaultStaticFeatureFlags } from '../staticFeatureFlags';
import staticFlagsJson from '../staticFlags.json';

describe('DefaultStaticFeatureFlags', () => {
  it('matches staticFlags.json', () => {
    expect(DefaultStaticFeatureFlags).toStrictEqual(staticFlagsJson);
  });
});

describe('getStaticFeatureFlag', () => {
  it('reads flag value from ReanimatedModule', () => {
    const value = getStaticFeatureFlag('RUNTIME_TEST_FLAG');
    expect(typeof value).toBe('boolean');
  });

  it('falls back to default flag and warns when native module throws', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const origGet = ReanimatedModule.getStaticFeatureFlag;
    ReanimatedModule.getStaticFeatureFlag = () => {
      throw new Error('Unable to recognize flag: UNKNOWN_FLAG');
    };

    // @ts-expect-error testing unknown flag fallback
    const value = getStaticFeatureFlag('UNKNOWN_FLAG');
    expect(value).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unable to read static feature flag 'UNKNOWN_FLAG'")
    );

    ReanimatedModule.getStaticFeatureFlag = origGet;
    warnSpy.mockRestore();
  });

  it('uses a configured true default when native module throws', () => {
    const origGet = ReanimatedModule.getStaticFeatureFlag;
    ReanimatedModule.getStaticFeatureFlag = () => {
      throw new Error(
        'Unable to recognize flag: EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS'
      );
    };

    const value = getStaticFeatureFlag(
      'EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS'
    );
    expect(value).toBe(true);

    ReanimatedModule.getStaticFeatureFlag = origGet;
  });
});

