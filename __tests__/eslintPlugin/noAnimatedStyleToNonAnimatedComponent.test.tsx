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

/**
 * Correct code correctly classified as satisfying the rule
 */
const trueNegative = [
  'const a = 7',
  `${animatedStyle}
return <Animated.View style={animatedStyle}/>
`,
  '<View style={ someStyle } />',
  '<View style={{ width }} />',
  '<View style={{ width: someValue }} />',
  `const widthSv = useSharedValue(45);
  <View style={{ width }} />`,
  `const width = useSharedValue(45);
<View style={{ width:100 }} />`,
  `const width = useSharedValue(45);
const myWidth = 100;

<View style={{ width:myWidth }} />`,
];

/**
 * Incorrect code incorrectly classified as satisfying the rule
 */
const falseNegative = [
  `import { Animated } from 'react-native';

  export default function EmptyExample() {
    ${animatedStyle}
    return (<Animated.View style={animatedStyle}/>)
  }
  `,
  `
  export default function EmptyExample() {
    ${animatedStyle}
    const animatedStyle2 = animatedStyle;
    return (<Animated.View style={animatedStyle2}/>)
  }`,
  `
  export default function EmptyExample() {
    const widthSv = useSharedValue(45);
    const widthSv2 = widthSv;
    return (<Animated.View style={{width: widthSv2}}/>)
  }`,
];

/**
 * Incorrect code correctly classified as not satisfying the rule
 */
const truePositive = [
  ...[
    `${animatedStyle}
  return <View style={animatedStyle}/>;
`,
    `${animatedStyle}
  return <View style={[animatedStyle]}/>;
`,
    `${animatedStyle}
return <View style={[someOtherStyle, animatedStyle]}/>;
`,
  ].map((code) => {
    return { code, errors: [animatedStyleError] };
  }),

  ...[
    `const widthSv = useSharedValue(45);
  return <View style={{ width: widthSv }} />;
  `,
    `const widthSv = useSharedValue(45);
  return <View style={{ width: widthSv, height:100}} />;
  `,
    `const widthSv = useSharedValue(45);
    return <View style={[{ width: widthSv, height:100}, someOtherStyle]} />;
  `,
  ].map((code) => {
    return { code, errors: [sharedValueError1] };
  }),

  ...[
    `const width = useSharedValue(45);
  return <View style={{ width }} />;`,
    `const width = useSharedValue(45);
  return <View style={{ height, width, color:'red' }} />;`,
  ].map((code) => {
    return { code, errors: [sharedValueError2] };
  }),
];

const falsePositive = [
  {
    code: `
import MyCustomAnimatedComponent from './MyCustomAnimatedComponent';
export default function EmptyExample() {
  ${animatedStyle}
  return (<MyCustomAnimatedComponent style={animatedStyle}/>)
}
`,
    errors: [
      {
        messageId: 'animatedStyle',
        data: {
          componentName: 'MyCustomAnimatedComponent',
          variableName: 'animatedStyle',
        },
      },
    ],
  },
];

const ruleName = 'animated-style-non-animated-component';
ruleTester.run(`Test rule ${ruleName}`, rules[ruleName], {
  valid: [...trueNegative, ...falseNegative],
  invalid: [...truePositive, ...falsePositive],
});
