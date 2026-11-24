import { RuleTester } from '@typescript-eslint/rule-tester';

import { rules } from '../src';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const error = { messageId: 'sharedValueInInlineStyle' } as const;

ruleTester.run(
  'no-shared-value-in-inline-style',
  rules['no-shared-value-in-inline-style'],
  {
    valid: [
      '<Animated.View style={animatedStyle} />;',
      '<Animated.View style={[styles.box, animatedStyle]} />;',
      '<Animated.View style={{ width: sv }} />;',
      '<Animated.View style={{ transform: [{ translateX: sv }] }} />;',
      "<Animated.View style={{ width: sv['value'] }} />;",
      '<Animated.View style={{ width: sv[value] }} />;',
      '<Animated.View style={{ width: sv?.value }} />;',
      '<Animated.View style={{ width: sv.current }} />;',
      '<Animated.View style={{ width: sv.value.width }} />;',
      '<Animated.View style={{ width: fn(sv.value) }} />;',
      '<Animated.View style={{ ...sv.value }} />;',
      '<Animated.View style={sv.value} />;',
      '<Animated.View style={[sv.value]} />;',
      '<Animated.View style={{ transform: sv.value }} />;',
      '<Animated.View style={{ transform: [sv.value] }} />;',
      '<Animated.View contentContainerStyle={{ width: sv.value }} />;',
      '<Animated.View width={sv.value} />;',
      '<Animated.View animatedProps={{ width: sv.value }} />;',
      'const style = { width: sv.value };',
    ],
    invalid: [
      {
        code: '<Animated.View style={{ width: sv.value }} />;',
        errors: [error],
      },
      {
        code: '<View style={{ width: sv.value, height: other.value }} />;',
        errors: [error, error],
      },
      {
        code: '<Animated.View style={[styles.box, { width: sv.value }]} />;',
        errors: [error],
      },
      {
        code: '<Animated.View style={{ transform: [{ translateX: sv.value }] }} />;',
        errors: [error],
      },
      {
        code: '<Animated.View style={[{ transform: [{ scale: sv.value }, { rotate: rotation }] }]} />;',
        errors: [error],
      },
      {
        code: '<Animated.View style={{ width: this.state.value }} />;',
        errors: [error],
      },
    ],
  }
);
