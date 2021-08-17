import { WorkletFunction } from './commonTypes';

declare const _WORKLET: boolean;
declare const _frameTimestamp: number;
declare const _eventTimestamp: number;
declare const _getCurrentTime: () => number;
declare const _setGlobalConsole: () => void;
declare const __reanimatedWorkletInit: (worklet: WorkletFunction) => void;
declare const _log: (s: string) => void;
declare const _stopObservingProgress: (tag: number, flag: boolean) => void;
declare const _startObservingProgress: (
  tag: number,
  flag: { value: boolean; _value: boolean }
) => void;
declare namespace NodeJS {
  interface Global {
    LayoutAnimationRepository: {
      configs: Record<string, unknown>;
      registerConfig(tag: number, config: Record<string, unknown>): void;
      removeConfig(tag: number): void;
      startAnimationForTag(
        tag: number,
        type: string,
        yogaValues: unknown
      ): void;
    };
  }
}
