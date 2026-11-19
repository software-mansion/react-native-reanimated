interface FixtureProxy {
  noArguments(): void;
  twoArguments(first: number, second?: string): void;
  typedArguments(first: number, second: Map<number, string>): void;
  moduleArguments(first: number): void;
}

declare const __proxy: FixtureProxy;
