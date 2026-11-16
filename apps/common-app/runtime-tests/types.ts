export interface RuntimeTestSuite {
  testSuiteName: string;
  importTest: () => void;
  skipByDefault?: boolean;
  needsRuntimeTestsServer?: boolean;
  disabled?: boolean;
}
