import { SharedTransition } from '../src/layoutReanimation';
import { FadeIn } from '../src/layoutReanimation/defaultAnimations/Fade';

function builtDuration(transition: SharedTransition) {
  transition.build();
  return transition.getAnimationAndConfig()[1].duration;
}

describe('layout animation duration', () => {
  test('SharedTransition defaults to 500 ms', () => {
    expect(builtDuration(new SharedTransition())).toBe(500);
  });

  test('SharedTransition build keeps the duration of the builder unset', () => {
    const transition = new SharedTransition();
    transition.build();
    expect(transition.durationV).toBeUndefined();
  });

  test('SharedTransition keeps a zero duration', () => {
    expect(builtDuration(SharedTransition.duration(0))).toBe(0);
  });

  test('SharedTransition spring defaults to 500 ms', () => {
    expect(builtDuration(SharedTransition.springify())).toBe(500);
    expect(builtDuration(SharedTransition.springify().dampingRatio(0.5))).toBe(
      500
    );
  });

  test('SharedTransition spring with dampingRatio and a physics value defaults to 500 ms', () => {
    expect(
      builtDuration(SharedTransition.springify().mass(2).dampingRatio(0.5))
    ).toBe(500);
  });

  test('SharedTransition physics-based spring has no default duration', () => {
    const transition = SharedTransition.springify().damping(15).stiffness(150);
    expect(builtDuration(transition)).toBeUndefined();
    expect(transition.getAnimationAndConfig()[1]).toMatchObject({
      damping: 15,
      stiffness: 150,
    });
  });

  test('SharedTransition physics-based spring keeps a set duration', () => {
    expect(builtDuration(SharedTransition.springify(300).mass(2))).toBe(300);
  });

  test('other builders keep a zero duration', () => {
    expect(FadeIn.duration(0).getAnimationAndConfig()[1].duration).toBe(0);
  });

  test('builders still drop a zero spring value', () => {
    const config = FadeIn.springify().damping(0).getAnimationAndConfig()[1];
    expect(config).not.toHaveProperty('damping');
  });
});
