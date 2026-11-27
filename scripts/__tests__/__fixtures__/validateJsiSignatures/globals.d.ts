interface FixtureProxy {
  noArguments(): void;
  twoArguments(first: number, second?: string): void;
  typedArguments(first: number, second: Map<number, string>): void;
  moduleArguments(first: number): void;
  scalarArguments(first: number, second: string, third: boolean): void;
  objectArguments<T extends object>(
    array: T[],
    callback: () => void,
    buffer: ArrayBuffer,
    value: T,
    anything: unknown
  ): void;
}

declare const __proxy: FixtureProxy;
