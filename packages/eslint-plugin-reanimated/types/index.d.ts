import type { TSESLint } from '@typescript-eslint/utils';
export declare const rules: {
  'animated-style-non-animated-component': TSESLint.RuleModule<
    'animatedStyle' | 'sharedValue',
    [],
    TSESLint.RuleListener
  >;
  'use-reanimated-error': TSESLint.RuleModule<
    'useReanimatedError',
    [],
    TSESLint.RuleListener
  >;
  'use-worklets-resolver': TSESLint.RuleModule<
    'useWorkletsResolver',
    [],
    TSESLint.RuleListener
  >;
};
