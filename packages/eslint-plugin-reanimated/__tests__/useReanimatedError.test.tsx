/* eslint-disable */
// @ts-nocheck
// TODO: FIX THESE
// eslint-disable-next-line import/no-unresolved
import { RuleTester } from '@typescript-eslint/rule-tester';
import { rules } from '../src';

// For reasons unknown the following line causes Jest to hang indefinitely
// hence we disable this test suite until it's resolved
// const ruleTester = new RuleTester({
//   parserOptions: {
//     ecmaFeatures: {
//       jsx: true,
//     },
//     sourceType: 'module',
//   },
//   parser: '@typescript-eslint/parser',
// });

// const testCases = {
//   withReanimatedError: {
//     /** Correct code correctly classified as satisfying the rule */
//     trueNegative: [
//       `const err = new ReanimatedError('Something went wrong');`,
//       `function createError() { return new ReanimatedError('Error message'); }`,
//       `throw new ReanimatedError('Custom error');`,
//     ],
//     /** Incorrect code correctly classified as not satisfying the rule */
//     truePositive: [
//       {
//         code: `const err = new Error('Something went wrong');`,
//         errors: [{ messageId: 'useReanimatedError' }],
//         output: `const err = new ReanimatedError('Something went wrong');`,
//       },
//       {
//         code: `function createError() { return new Error('Error message'); }`,
//         errors: [{ messageId: 'useReanimatedError' }],
//         output: `function createError() { return new ReanimatedError('Error message'); }`,
//       },
//       {
//         code: `throw new Error('Custom error');`,
//         errors: [{ messageId: 'useReanimatedError' }],
//         output: `throw new ReanimatedError('Custom error');`,
//       },
//     ],
//     /** Incorrect code incorrectly classified as satisfying the rule */
//     falseNegative: [],
//     /** Incorrect code incorrectly classified as not satisfying the rule */
//     falsePositive: [],
//   },
// };

// const { withReanimatedError } = testCases;

// const ruleName = 'use-reanimated-error';
// ruleTester.run(`Test rule ${ruleName}`, rules[ruleName], {
//   valid: [...withReanimatedError.trueNegative],
//   invalid: [...withReanimatedError.truePositive],
// });
