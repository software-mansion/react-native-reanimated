import { StyleSheet, Text } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import {
  Screen,
  Scroll,
  Section,
  VerticalExampleCard,
} from '@/apps/css/components';
import { colors, spacing } from '@/theme';

const ORBIT_RX = 90;
const ORBIT_RY = 40;
const ORBIT_DURATION = '12s';
const ORBIT_STEPS = 36;

const PLANETS = [
  { color: colors.danger, name: 'Mars', size: 44 },
  { color: colors.primary, name: 'Venus', size: 60 },
  { color: colors.primaryDark, name: 'Jupiter', size: 78 },
];

const MAX_PLANET_SIZE = Math.max(...PLANETS.map((planet) => planet.size));
const PLANE_WIDTH = 2 * ORBIT_RX + MAX_PLANET_SIZE;
const PLANE_HEIGHT = 2 * ORBIT_RY + MAX_PLANET_SIZE;
const CENTER_X = PLANE_WIDTH / 2;
const CENTER_Y = PLANE_HEIGHT / 2;

function makeOrbit(offsetDeg: number, size: number) {
  const frames: Record<string, { left: number; top: number }> = {};
  for (let step = 0; step <= ORBIT_STEPS; step++) {
    const percent = ((step / ORBIT_STEPS) * 100).toFixed(4);
    const angle = ((offsetDeg + (360 * step) / ORBIT_STEPS) * Math.PI) / 180;
    frames[`${percent}%`] = {
      left: CENTER_X + ORBIT_RX * Math.cos(angle) - size / 2,
      top: CENTER_Y + ORBIT_RY * Math.sin(angle) - size / 2,
    };
  }
  return css.keyframes(frames);
}

const ORBITS = PLANETS.map((planet, index) =>
  makeOrbit((360 / PLANETS.length) * index, planet.size)
);

export default function Planets() {
  return (
    <Screen>
      <Scroll contentContainerStyle={styles.content} withBottomBarSpacing>
        <Section
          description="Three differently sized planets orbit the screen center on a tilted (elliptical) path. Each planet's name is hidden until you press it, which activates its ':active' pseudo-selector; hovering enlarges it with a colored glow."
          title="Planets">
          <VerticalExampleCard
            title="Press a planet to reveal its name"
            code={`<Animated.View
  style={{
    // 0.02 not 0: iOS skips alpha<0.01 views in hit-testing
    opacity: { default: 0.02, ':active': 1 },
    transitionDuration: '200ms',
  }}
  onStartShouldSetResponder={() => true}>
  <Text>{name}</Text>
</Animated.View>`}
            collapsedCode={`opacity: {
  default: 0.02,
  ':active': 1,
},`}>
            <Animated.View style={styles.stage}>
              <Animated.View style={styles.orbitPlane}>
                {PLANETS.map((planet, index) => (
                  <Animated.View
                    key={planet.name}
                    style={[
                      styles.orbiter,
                      {
                        animationDuration: ORBIT_DURATION,
                        animationIterationCount: 'infinite',
                        animationName: ORBITS[index],
                        animationTimingFunction: 'linear',
                      },
                      {
                        backgroundColor: planet.color,
                        borderRadius: planet.size / 2,
                        height: planet.size,
                        width: planet.size,
                        elevation: { ':hover': 12, default: 0 },
                        shadowColor: planet.color,
                        shadowOpacity: { ':hover': 0.9, default: 0 },
                        shadowRadius: { ':hover': 18, default: 0 },
                        transform: {
                          ':hover': [{ scale: 1.1 }],
                          default: [{ scale: 1 }],
                        },
                        transitionDuration: '200ms',
                      },
                    ]}>
                    <Animated.View
                      style={[
                        styles.nameWrapper,
                        {
                          opacity: { ':active': 1, default: 0.02 },
                          transitionDuration: '200ms',
                        },
                      ]}
                      onStartShouldSetResponder={() => true}>
                      <Text style={styles.name}>{planet.name}</Text>
                    </Animated.View>
                  </Animated.View>
                ))}
              </Animated.View>
            </Animated.View>
          </VerticalExampleCard>
        </Section>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
  },
  name: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameWrapper: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  orbitPlane: {
    height: PLANE_HEIGHT,
    width: PLANE_WIDTH,
  },
  orbiter: {
    position: 'absolute',
    shadowOffset: { height: 0, width: 0 },
  },
  stage: {
    alignItems: 'center',
    height: PLANE_HEIGHT + spacing.xl,
    justifyContent: 'center',
  },
});
