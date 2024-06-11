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

// const animatedStyle = `
// const animatedStyle = useAnimatedStyle(() => {
//     return {
//       width: size,
//       height: size,
//     };
//   }, []);
// `;

// const testCases = {
// withAnimatedStyle: {
//   /** Correct code correctly classified as satisfying the rule */
//   trueNegative: [
//     `${animatedStyle}
//     return <Animated.View style={animatedStyle}/>
//     `,
//   ],
//   /** Incorrect code incorrectly classified as satisfying the rule */
//   falseNegative: [
//     `import { Animated } from 'react-native';
//     export default function EmptyExample() {
//       ${animatedStyle}
//       return (<Animated.View style={animatedStyle}/>)
//     }`,
//     `export default function EmptyExample() {
//       ${animatedStyle}
//       const animatedStyle2 = animatedStyle;
//       return (<Animated.View style={animatedStyle2}/>)
//     }`,
//   ],
//   /** Incorrect code correctly classified as not satisfying the rule */
//   truePositive: [
//     `${animatedStyle}
//       return <View style={animatedStyle}/>;
//     `,
//     `${animatedStyle}
//       return <View style={[animatedStyle]}/>;
//     `,
//     `${animatedStyle}
//       return <View style={[someOtherStyle, animatedStyle]}/>;
//     `,
//   ].map((code) => {
//     return {
//       code,
//       errors: [
//         {
//           messageId: 'animatedStyle',
//           data: {
//             componentName: 'View',
//             variableName: 'animatedStyle',
//           },
//         },
//       ],
//     };
//   }),
//   /** Incorrect code incorrectly classified as not satisfying the rule */
//   falsePositive: [
//     {
//       code: `
// import MyCustomAnimatedComponent from './MyCustomAnimatedComponent';
// export default function EmptyExample() {
//   ${animatedStyle}
//   return (<MyCustomAnimatedComponent style={animatedStyle}/>)
// }
// `,
//       errors: [
//         {
//           messageId: 'animatedStyle',
//           data: {
//             componentName: 'MyCustomAnimatedComponent',
//             variableName: 'animatedStyle',
//           },
//         },
//       ],
//     },
//   ],
// },
// withSharedValue: {
//   /** Correct code correctly classified as satisfying the rule */
//   trueNegative: [
//     `const widthSv = useSharedValue(45);
//     <View style={{ width }} />`,
//     `const width = useSharedValue(45);
//     <View style={{ width:100 }} />`,
//     `const width = useSharedValue(45);
//     const myWidth = 100;
//     <View style={{ width:myWidth }} />`,
//   ],
//   /** Incorrect code incorrectly classified as satisfying the rule */
//   falseNegative: [
//     `export default function EmptyExample() {
//       const widthSv = useSharedValue(45);
//       const widthSv2 = widthSv;
//       return (<Animated.View style={{width: widthSv2}}/>)
//     }`,
//   ],
//   /** Incorrect code correctly classified as not satisfying the rule */
//   truePositive: [
//     ...[
//       `const widthSv = useSharedValue(45);
//   return <View style={{ width: widthSv }} />;
//   `,
//       `const widthSv = useSharedValue(45);
//   return <View style={{ width: widthSv, height:100}} />;
//   `,
//       `const widthSv = useSharedValue(45);
//     return <View style={[{ width: widthSv, height:100}, someOtherStyle]} />;
//   `,
//     ].map((code) => {
//       return {
//         code,
//         errors: [
//           {
//             messageId: 'sharedValue',
//             data: {
//               componentName: 'View',
//               propertyName: 'width',
//               propertyValue: 'widthSv',
//             },
//           },
//         ],
//       };
//     }),
//     ...[
//       `const width = useSharedValue(45);
//     return <View style={{ width }} />;`,
//       `const width = useSharedValue(45);
//     return <View style={{ height, width, color:'red' }} />;`,
//     ].map((code) => {
//       return {
//         code,
//         errors: [
//           {
//             messageId: 'sharedValue',
//             data: {
//               componentName: 'View',
//               propertyName: 'width',
//               propertyValue: 'width',
//             },
//           },
//         ],
//       };
//     }),
//   ],
//   falsePositive: [],
// },
// otherTestCases: {
//   /** Correct code correctly classified as satisfying the rule */
//   trueNegative: [
//     'const a = 7',
//     '<View style={ someStyle } />',
//     '<View style={{ width }} />',
//     '<View style={{ width: someValue }} />',
//   ],
// },
// };

// const { withAnimatedStyle, withSharedValue, otherTestCases } = testCases;

// const ruleName = 'animated-style-non-animated-component';
// ruleTester.run(`Test rule ${ruleName}`, rules[ruleName], {
//   valid: [
//     ...withAnimatedStyle.trueNegative,
//     ...withSharedValue.trueNegative,
//     ...otherTestCases.trueNegative,

//     ...withAnimatedStyle.falseNegative,
//     ...withSharedValue.falseNegative,
//   ],
//   invalid: [
//     ...withAnimatedStyle.truePositive,
//     ...withSharedValue.truePositive,
//     ...withAnimatedStyle.falsePositive,
//   ],
// });
