import type { TSESLint } from '@typescript-eslint/utils';

import noAnimatedStyleToNonAnimatedComponent from './noAnimatedStyleToNonAnimatedComponent';
import noLoggerMessagePrefix from './noLoggerMessagePrefix';
import useGlobalThis from './useGlobalThis';
import useLogger from './useLogger';
import useReanimatedError from './useReanimatedError';
import useWorkletsError from './useWorkletsError';
import wrongLoggerImport from './wrongLoggerImport';

export const rules = {
  'animated-style-non-animated-component':
    noAnimatedStyleToNonAnimatedComponent,
  'use-logger': useLogger,
  'wrong-logger-import': wrongLoggerImport,
  'no-logger-message-prefix': noLoggerMessagePrefix,
  'use-reanimated-error': useReanimatedError,
  'use-worklets-error': useWorkletsError,
  'use-global-this': useGlobalThis,
} satisfies Record<string, TSESLint.RuleModule<string, Array<unknown>>>;
