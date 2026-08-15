import { PlatformColor } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { ScrollScreen, Section, Stagger } from '@/apps/css/components';
import { radius, sizes } from '@/theme';
import { IS_IOS } from '@/utils';

const blue = IS_IOS
  ? PlatformColor('systemBlue')
  : PlatformColor('?attr/colorPrimary');
const red = IS_IOS
  ? PlatformColor('systemRed')
  : PlatformColor('?attr/colorError');
const label = IS_IOS
  ? PlatformColor('labelColor')
  : PlatformColor('?attr/colorOnBackground');

const bothPlatform = css.keyframes({
  from: { backgroundColor: blue },
  to: { backgroundColor: red },
});

const mixedWithLiteral = css.keyframes({
  from: { backgroundColor: '#2ecc71' },
  to: { backgroundColor: red },
});

const themeAware = css.keyframes({
  from: { backgroundColor: label },
  to: { backgroundColor: blue },
});

const animation = css.create({
  box: {
    animationDirection: 'alternate',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    borderRadius: radius.sm,
    height: sizes.lg,
    width: sizes.xxxl,
  },
});

const RESOLVED_NOTE = IS_IOS
  ? ''
  : ' Resolution is iOS-only so far, so here the color steps between the endpoints instead of blending.';

export default function PlatformColors() {
  return (
    <ScrollScreen>
      <Stagger>
        <Section
          description={`Both endpoints are platform colors, so the blend follows the current appearance - toggle dark mode while it runs and the colors re-resolve.${RESOLVED_NOTE}`}
          title="Between two platform colors">
          <Animated.View
            style={[animation.box, { animationName: bothPlatform }]}
          />
        </Section>

        <Section
          description="A literal color blends with a platform color the same way."
          title="Mixed with a literal">
          <Animated.View
            style={[animation.box, { animationName: mixedWithLiteral }]}
          />
        </Section>

        <Section
          description="Theme-aware endpoints, such as the label color, pick up their dark variants mid-animation."
          title="Theme-aware endpoints">
          <Animated.View
            style={[animation.box, { animationName: themeAware }]}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}
