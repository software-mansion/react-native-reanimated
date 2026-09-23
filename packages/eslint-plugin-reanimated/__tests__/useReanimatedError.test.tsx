import { RuleTester } from '@typescript-eslint/rule-tester';

import { rules } from '../src';

const ruleTester = new RuleTester();

ruleTester.run('use-reanimated-error', rules['use-reanimated-error'], {
  valid: [
    `const err = new Error('[Reanimated] Something went wrong');`,
    'const err = new Error(`[Reanimated] Something went wrong`);',
    'const err = new Error(`[Reanimated] ${message}`);',
    `const err = new Error();`,
    `const err = new TypeError('Something went wrong');`,
    `const err = new Error('[Reanimated] Something ' + 'went wrong');`,
    "const err = new Error('[Reanimated] Something ' + `went ${wrong}`);",
    'const err = new Error(`[Reanimated] Something ` + went + wrong);',
  ],
  invalid: [
    {
      code: `const err = new Error('Something went wrong');`,
      errors: [{ messageId: 'useReanimatedError' }],
      output: `const err = new Error("[Reanimated] Something went wrong");`,
    },
    {
      code: `function createError() { return new Error('Error message'); }`,
      errors: [{ messageId: 'useReanimatedError' }],
      output: `function createError() { return new Error("[Reanimated] Error message"); }`,
    },
    {
      code: `throw new Error('Custom error');`,
      errors: [{ messageId: 'useReanimatedError' }],
      output: `throw new Error("[Reanimated] Custom error");`,
    },
    {
      code: 'throw new Error(`Custom ${message}`);',
      errors: [{ messageId: 'useReanimatedError' }],
      output: 'throw new Error(`[Reanimated] Custom ${message}`);',
    },
    {
      code: `throw new Error(message);`,
      errors: [{ messageId: 'useReanimatedError' }],
      output: 'throw new Error(`[Reanimated] ${message}`);',
    },
    {
      code: `throw new Error('Something ' + 'went wrong');`,
      errors: [{ messageId: 'useReanimatedError' }],
      output: `throw new Error("[Reanimated] Something " + 'went wrong');`,
    },
    {
      code: 'throw new Error(`Something ${bad}` + suffix);',
      errors: [{ messageId: 'useReanimatedError' }],
      output: 'throw new Error(`[Reanimated] Something ${bad}` + suffix);',
    },
  ],
});
