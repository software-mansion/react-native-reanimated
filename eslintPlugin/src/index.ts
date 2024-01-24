import { TSESLint } from '@typescript-eslint/utils';
import noAnimatedStyleToNonAnimatedComponent from './noAnimatedStyleToNonAnimatedComponent';

export const rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent,
} satisfies Record<string, TSESLint.RuleModule<string, Array<unknown>>>;
