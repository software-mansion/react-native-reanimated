import { WebWorker } from 'react-native-worklets';

export function performHeavyComputation() {
  console.log('Starting heavy computation');
    for (let i = 0; i < 500_000_000; i++) {
      Math.sqrt(i);
    }
    console.log('Done');
  }

  export const myWorker = new WebWorker<string, Record<string, unknown>>('Worker #1', () => {
    'worklet';
    let state = 0;

    onmessage = (e: { data: string }) => {
      state = state + 1;
      console.log(`Worker started job ${state} with data: ${e.data}`);
      if (e.data === 'error') {
        throw new Error('Error from worker!!!');
      }
      console.log('Starting heavy computation');
      for (let i = 0; i < 500_000_000; i++) {
        Math.sqrt(i);
      }
      global.postMessage(`Done job ${state}`);
    };
  });

  myWorker.onmessage = (e: { data: Record<string, unknown> }) => {
    console.log('JS received:', e.data);
  };

  myWorker.onerror = (e: { data: string }) => {
    console.error('JS received error:', e);
  };
