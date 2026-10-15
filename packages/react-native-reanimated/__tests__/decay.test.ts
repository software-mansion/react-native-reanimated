import { ReduceMotion, withDecay } from '../src';
import type { DecayAnimation, WithDecayConfig } from '../src';

const START = 1_000;

function framesOf(config: WithDecayConfig): unknown[] {
  const animation = withDecay({
    reduceMotion: ReduceMotion.Never,
    ...config,
  }) as unknown as DecayAnimation;
  animation.onStart(animation, 0, START, animation);
  return [16, 100, 300, 1_000].map((runtime) => {
    animation.onFrame(animation, START + runtime);
    return animation.current;
  });
}

describe('withDecay', () => {
  describe('an undefined config value', () => {
    test.each<{
      name: string;
      withUndefined: WithDecayConfig;
      without: WithDecayConfig;
    }>([
      { name: 'velocity', withUndefined: { velocity: undefined }, without: {} },
      {
        name: 'deceleration',
        withUndefined: { velocity: 1_000, deceleration: undefined },
        without: { velocity: 1_000 },
      },
      {
        name: 'velocityFactor',
        withUndefined: { velocity: 1_000, velocityFactor: undefined },
        without: { velocity: 1_000 },
      },
      {
        name: 'rubberBandFactor',
        withUndefined: {
          velocity: 1_000,
          rubberBandEffect: true,
          clamp: [0, 100],
          rubberBandFactor: undefined,
        },
        without: { velocity: 1_000, rubberBandEffect: true, clamp: [0, 100] },
      },
    ])('leaves the default $name in place', ({ withUndefined, without }) => {
      expect(framesOf(withUndefined)).toEqual(framesOf(without));
    });
  });
});
