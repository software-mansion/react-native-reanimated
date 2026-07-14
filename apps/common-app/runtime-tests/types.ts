export interface RuntimeTestSuite {
  testSuiteName: string;
  importTest: () => void;
  skipByDefault?: boolean;
  disabled?: boolean;
}
