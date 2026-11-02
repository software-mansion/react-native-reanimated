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

  test('SharedTransition keeps a zero duration', () => {
    expect(builtDuration(SharedTransition.duration(0))).toBe(0);
  });

  test('other builders keep a zero duration', () => {
    expect(FadeIn.duration(0).getAnimationAndConfig()[1].duration).toBe(0);
  });
});
