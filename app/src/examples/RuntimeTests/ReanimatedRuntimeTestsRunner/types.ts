type CallTrucker = {
  UICallsCount: number;
  JSCallsCount: number;
};

export type TrackerCallCount = {
  name: string;
  JS: number;
  UI: number;
};

export type TestCase = {
  name: string;
  testCase: () => void;
  componentsRefs: Record<string, React.MutableRefObject<any>>;
  callsRegistry: Record<string, CallTrucker>;
  errors: string[];
};

export type TestSuite = {
  name: string;
  buildSuite: () => void;
  testCases: TestCase[];
  beforeAll?: () => void;
  afterAll?: () => void;
  beforeEach?: () => void;
  afterEach?: () => void;
};
