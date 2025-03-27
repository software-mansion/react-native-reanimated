import { useEffect } from 'react';
import { isWorkletFunction, runOnUI } from 'react-native-worklets';

export default function App() {
  const mydlo = 'smiglo';
  const widlo = 'powidlo';

  function foo() {
    'worklet';
    return mydlo + widlo;
  }

  useEffect(() => {
    runOnUI(foo)();
  }, []);

  return null;
}

export function foo() {
  'worklet';
}

export const bar = () => {
  'worklet';
  isWorkletFunction(foo);
};

export const foobar = function () {
  'worklet';
};

export const barfoo = function barfoo() {
  'worklet';
};
