interface FixtureProxy {
  noArguments(): void;
  twoArguments(first: number, second?: string): void;
}

declare const __proxy: FixtureProxy;
