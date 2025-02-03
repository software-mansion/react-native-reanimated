import type { TSESLint } from '@typescript-eslint/utils';
import noAnimatedStyleToNonAnimatedComponent from './noAnimatedStyleToNonAnimatedComponent';
import useReanimatedError from './useReanimatedError';
import useWorkletsError from './useWorkletsError';
import useWorkletsResolver from './useWorkletsResolver';

export const rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent,
  'use-reanimated-error': useReanimatedError,
  'use-worklets-error': useWorkletsError,
  'use-worklets-resolver': useWorkletsResolver,
} satisfies Record<string, TSESLint.RuleModule<string, Array<unknown>>>;
