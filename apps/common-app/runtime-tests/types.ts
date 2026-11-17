export interface RuntimeTestSuite {
  testSuiteName: string;
  importTest: () => void;
  skipByDefault?: boolean;
  fullRunOnly?: boolean;
  needsRuntimeTestsServer?: boolean;
  disabled?: boolean;
}
