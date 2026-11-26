import { requireNativeModule, type NativeModule } from 'expo';

declare class CounterModule extends NativeModule {
  getCount(): number;
  addWorkletListener(worklet: object): number;
  removeWorkletListener(id: number): void;
  addFrameWorkletListener(worklet: object): number;
  removeFrameWorkletListener(id: number): void;
}

export default requireNativeModule<CounterModule>('WithExpoModuleCounter');
