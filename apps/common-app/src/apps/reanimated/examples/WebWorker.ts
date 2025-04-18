// @ts-ignore
import { Worker } from 'react-native-worklets';

export function performHeavyComputation() {
    for (let i = 0; i < 500_000_000; i++) {
      Math.sqrt(i);
    }
    console.log('done');
  }


  export const myWorker = new Worker(() => {
    'worklet';
    let state = 0;

    console.log('Hello from worker');

    onmessage = (e) => {
      state = state + 1;
      console.log(`Worker started job ${state}`);
      for (let i = 0; i < 500_000_000; i++) {
        Math.sqrt(i);
      }
      global.postMessage(`Done job ${state}`);
    };
  });

  console.log(myWorker.toString());

  myWorker.onmessage = (e) => {
    console.log('JS', e.data);
  };