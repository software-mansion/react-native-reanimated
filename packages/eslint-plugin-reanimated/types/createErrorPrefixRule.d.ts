import type { TSESLint } from '@typescript-eslint/utils';
export declare function createErrorPrefixRule<MessageId extends string>(prefix: string, messageId: MessageId): TSESLint.RuleModule<MessageId, []>;
