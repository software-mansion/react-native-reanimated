interface FixtureProxy {
  noArguments(): void;
  twoArguments(first: number, second?: string): void;
  debugOnly?(): void;
}

declare const __proxy: FixtureProxy;
