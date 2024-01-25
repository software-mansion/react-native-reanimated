"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rule_tester_1 = require("@typescript-eslint/rule-tester");
const noAnimatedStyleToNonAnimatedComponent_1 = __importDefault(require("../src/noAnimatedStyleToNonAnimatedComponent"));
const ruleTester = new rule_tester_1.RuleTester({
    parser: '@typescript-eslint/parser',
});
ruleTester.run('Test rule 1', noAnimatedStyleToNonAnimatedComponent_1.default, {
    valid: ['const a = 7'],
    invalid: [
        {
            code: `
      const animatedStyle = useAnimatedStyle(() => {
        return {
          width: size,
          height: size,
        };
      }, []);
    
      return <View style={animatedStyle}/>;
    `,
            errors: [
                {
                    messageId: 'animatedStyle',
                    data: {
                        componentName: 'View',
                        variableName: 'animatedStyle',
                    },
                },
            ],
        },
    ],
});
