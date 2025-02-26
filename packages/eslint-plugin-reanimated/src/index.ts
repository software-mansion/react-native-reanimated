import type { TSESLint } from '@typescript-eslint/utils';

import noAnimatedStyleToNonAnimatedComponent from './noAnimatedStyleToNonAnimatedComponent';
import useReanimatedError from './useReanimatedError';
import useWorkletsError from './useWorkletsError';

export const rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent,
  'use-reanimated-error': useReanimatedError,
  'use-worklets-error': useWorkletsError,
} satisfies Record<string, TSESLint.RuleModule<string, Array<unknown>>>;
