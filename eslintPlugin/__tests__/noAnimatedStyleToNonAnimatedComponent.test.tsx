import { RuleTester } from '@typescript-eslint/rule-tester';
import noAnimatedStyleToNonAnimatedComponent from '../src/noAnimatedStyleToNonAnimatedComponent';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('Test rule 1', noAnimatedStyleToNonAnimatedComponent, {
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
