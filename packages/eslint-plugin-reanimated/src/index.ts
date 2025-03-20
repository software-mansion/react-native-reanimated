import type { TSESLint } from '@typescript-eslint/utils';

import noAnimatedStyleToNonAnimatedComponent from './noAnimatedStyleToNonAnimatedComponent';
import useGlobalThis from './useGlobalThis';
import useReanimatedError from './useReanimatedError';
import useWorkletsError from './useWorkletsError';

export const rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent,
  'use-reanimated-error': useReanimatedError,
  'use-worklets-error': useWorkletsError,
  'use-global-this': useGlobalThis,
} satisfies Record<string, TSESLint.RuleModule<string, Array<unknown>>>;
