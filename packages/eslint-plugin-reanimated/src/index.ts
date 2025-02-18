import type { TSESLint } from '@typescript-eslint/utils';

import noAnimatedStyleToNonAnimatedComponent from './noAnimatedStyleToNonAnimatedComponent';
import useReanimatedError from './useReanimatedError';

export const rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent,
  'use-reanimated-error': useReanimatedError,
} satisfies Record<string, TSESLint.RuleModule<string, Array<unknown>>>;
