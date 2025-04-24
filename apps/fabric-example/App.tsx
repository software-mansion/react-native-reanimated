import { makeShareableCloneRecursive, runOnUI } from 'react-native-worklets';

export default function App() {
  runOnUI(() => {
    'worklet';
    makeShareableCloneRecursive({});
    console.log('Hello from worklet');
  })();

  return null;
}
