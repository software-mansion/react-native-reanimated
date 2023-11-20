export type TestCase = {
  name: string;
  testCase: () => void;
  componentsRefs: Record<string, React.MutableRefObject<any>>;
  errors: string[];
}

export type TestSuite = {
  name: string;
  buildSuite: () => void;
  testCases: TestCase[];
  beforeAll?: () => void;
  afterAll?: () => void;
  beforeEach?: () => void;
  afterEach?: () => void;
}
