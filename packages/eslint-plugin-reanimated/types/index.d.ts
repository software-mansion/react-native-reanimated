import type { TSESLint } from '@typescript-eslint/utils';
export declare const rules: {
  'animated-style-non-animated-component': TSESLint.RuleModule<
    'animatedStyle' | 'sharedValue',
    [],
    unknown,
    TSESLint.RuleListener
  >;
  'use-reanimated-error': TSESLint.RuleModule<
    'useReanimatedError',
    [],
    unknown,
    TSESLint.RuleListener
  >;
  'use-worklets-error': TSESLint.RuleModule<
    'useWorkletsError',
    [],
    unknown,
    TSESLint.RuleListener
  >;
  'use-global-this': TSESLint.RuleModule<
    'useGlobalThis',
    [],
    unknown,
    TSESLint.RuleListener
  >;
};
