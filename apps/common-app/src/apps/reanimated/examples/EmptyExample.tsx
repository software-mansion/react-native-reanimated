import { makeShareableCloneRecursive, runOnUI } from 'react-native-worklets';

export default function App() {
  console.log('scheduling');
  runOnUI(function foo() {
    'worklet';
    makeShareableCloneRecursive({});
    console.log('Hello from worklet', new Error());
  })();

  runOnUI(makeShareableCloneRecursive)(1);

  return null;
}
