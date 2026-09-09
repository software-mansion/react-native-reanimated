import { View } from 'react-native';
import { describe, expect, test } from 'tstyche';

import type { CSSAnimationEvent, CSSTransitionEvent } from '..';
import Animated, { createCSSAnimatedComponent } from '..';

// `Animated.FlatList` and `createCSSAnimatedComponent` have hand-written props
// interfaces, so they do not inherit these from `AnimatedComponentType`.
describe('CSS callback props', () => {
  const onAnimation = (event: CSSAnimationEvent) => String(event.elapsedTime);
  const onTransition = (event: CSSTransitionEvent) => String(event.elapsedTime);

  test('are accepted by the built-in animated components', () => {
    expect(Animated.View).type.toBeCallableWith({
      onCSSAnimationEnd: onAnimation,
      onCSSTransitionRun: onTransition,
    });
    expect(Animated.FlatList).type.toBeCallableWith({
      data: [],
      renderItem: () => null,
      onCSSAnimationEnd: onAnimation,
      onCSSTransitionRun: onTransition,
    });
  });

  test('are accepted by components made with the CSS factory', () => {
    expect(createCSSAnimatedComponent(View)).type.toBeCallableWith({
      onCSSAnimationEnd: onAnimation,
      onCSSTransitionRun: onTransition,
    });
  });

  test('reject a misspelled callback name', () => {
    expect(Animated.View).type.not.toBeCallableWith({
      onCSSAnimationEnded: onAnimation,
    });
  });
});
