declare const _WORKLET: boolean;
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
