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
  'use-worklets-error': TSESLint.RuleModule<
    'useWorkletsError',
    [],
    TSESLint.RuleListener
  >;
  'use-global-this': TSESLint.RuleModule<
    'useGlobalThis',
    [],
    TSESLint.RuleListener
  >;
};
