import { RuleTester } from '@typescript-eslint/rule-tester';
import { rules } from '../../eslintPlugin';

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module',
  },
  parser: '@typescript-eslint/parser',
});

const animatedStyle = `
const animatedStyle = useAnimatedStyle(() => {
    return {
      width: size,
      height: size,
    };
  }, []);
`;

const animatedStyleError = {
  messageId: 'animatedStyle',
  data: {
    componentName: 'View',
    variableName: 'animatedStyle',
  },
} as const;

const sharedValueError1 = {
  messageId: 'sharedValue',
  data: {
    componentName: 'View',
    propertyName: 'width',
    propertyValue: 'widthSv',
  },
} as const;

const sharedValueError2 = {
  messageId: 'sharedValue',
  data: {
    componentName: 'View',
    propertyName: 'width',
    propertyValue: 'width',
  },
} as const;

ruleTester.run('Test rule 1', rules['animated-style-non-animated-component'], {
  valid: [
    'const a = 7',
    `${animatedStyle}
    return <Animated.View style={animatedStyle}/>
    `,
    '<View style={{ width }} />',
    `const widthSv = useSharedValue(45);
    <View style={{ width }} />`,
    `const width = useSharedValue(45);
    <View style={{ width:100 }} />`,
    `const width = useSharedValue(45);
    <View style={{ width:myWidth }} />`,
  ],
  invalid: [
    {
      code: `
      ${animatedStyle}
      return <View style={animatedStyle}/>;
    `,
      errors: [animatedStyleError],
    },
    {
      code: `
      ${animatedStyle}
      return <View style={[animatedStyle]}/>;
    `,
      errors: [animatedStyleError],
    },
    {
      code: `
      ${animatedStyle}
      return <View style={[someOtherStyle, animatedStyle]}/>;
    `,
      errors: [animatedStyleError],
    },
    {
      code: `
    const widthSv = useSharedValue(45);
    return <View style={{ width: widthSv }} />;
    `,
      errors: [sharedValueError1],
    },
    {
      code: `
    const widthSv = useSharedValue(45);
    return <View style={{ width: widthSv, height:100}} />;
    `,
      errors: [sharedValueError1],
    },
    {
      code: `
    const widthSv = useSharedValue(45);
    return <View style={[{ width: widthSv, height:100}, someOtherStyle]} />;
    `,
      errors: [sharedValueError1],
    },
    {
      code: `
    const width = useSharedValue(45);
    return <View style={{ width }} />;
    `,
      errors: [sharedValueError2],
    },
    {
      code: `
    const width = useSharedValue(45);
    return <View style={{ height, width, color:'red' }} />;
    `,
      errors: [sharedValueError2],
    },
  ],
});
