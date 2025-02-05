import type { TSESLint } from '@typescript-eslint/utils';

import noAnimatedStyleToNonAnimatedComponent from './noAnimatedStyleToNonAnimatedComponent';
import useReanimatedError from './useReanimatedError';
import useWorkletsResolver from './useWorkletsResolver';

export const rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent,
  'use-reanimated-error': useReanimatedError,
  'use-worklets-resolver': useWorkletsResolver,
} satisfies Record<string, TSESLint.RuleModule<string, Array<unknown>>>;
