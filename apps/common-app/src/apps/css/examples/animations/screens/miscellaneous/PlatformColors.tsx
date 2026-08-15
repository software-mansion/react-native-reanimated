import { PlatformColor } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { ScrollScreen, Section, Stagger } from '@/apps/css/components';
import { radius, sizes } from '@/theme';
import { IS_IOS, IS_WEB } from '@/utils';

// react-native-web has no PlatformColor, so web falls back to literals.
const blue = IS_WEB
  ? '#0a84ff'
  : IS_IOS
    ? PlatformColor('systemBlue')
    : PlatformColor('?attr/colorPrimary');
const red = IS_WEB
  ? '#ff453a'
  : IS_IOS
    ? PlatformColor('systemRed')
    : PlatformColor('?attr/colorError');
const label = IS_WEB
  ? '#000000'
  : IS_IOS
    ? PlatformColor('labelColor')
    : PlatformColor('?attr/colorOnBackground');

const NOTE = IS_WEB
  ? ' PlatformColor does not exist on web, so this screen shows literal fallbacks.'
  : IS_IOS
    ? ''
    : ' Resolution is iOS-only so far, so on this platform the color steps between the endpoints instead.';

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

export default function PlatformColors() {
  return (
    <ScrollScreen>
      <Stagger>
        <Section
          description={`Both endpoints are platform colors, blended against the current appearance.${NOTE}`}
          title="Between two platform colors">
          <Animated.View
            style={[animation.box, { animationName: bothPlatform }]}
          />
        </Section>

        <Section
          title="Mixed with a literal"
          description={
            IS_IOS
              ? 'A literal color blends with a platform color the same way.'
              : 'A literal color paired with a platform color follows the same rules.'
          }>
          <Animated.View
            style={[animation.box, { animationName: mixedWithLiteral }]}
          />
        </Section>

        <Section
          title="Theme-aware endpoints"
          description={
            IS_IOS
              ? 'Theme-aware endpoints, such as the label color, pick up their dark variants mid-animation - toggle dark mode while it runs.'
              : 'Theme-aware endpoints, such as the label color, render their current theme variants.'
          }>
          <Animated.View
            style={[animation.box, { animationName: themeAware }]}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}
