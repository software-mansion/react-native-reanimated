import { useRef } from "react";
import { findNodeHandle } from "react-native";
import { getViewProp, makeMutable, runOnJS, runOnUI } from "react-native-reanimated";

type TestCase = {
  name: string;
  testCase: () => void;
  componentsRefs: Record<string, React.MutableRefObject<any>>;
  errors: string[];
}
type TestSuite = {
  name: string;
  buildSuite: () => void;
  testCases: TestCase[];
  beforeAll?: () => void;
  afterAll?: () => void;
  beforeEach?: () => void;
  afterEach?: () => void;
}
let renderFnHolder: (component: any) => void = () => {};
class TestRunner {
  private testSuites: TestSuite[] = [];
  private currentTestSuite: TestSuite | null = null;
  private currentTestCase: TestCase | null = null;

  public describe(name: string, buildSuite: () => void) {
    this.testSuites.push({
      name,
      buildSuite,
      testCases: [],
    });
  };

  public test(name: string, testCase: () => void) {
    if (!this.currentTestSuite) {
      throw new Error("Undefined test suite context");
    }
    this.currentTestSuite.testCases.push({
      name,
      testCase,
      componentsRefs: {},
      errors: [],
    });
  };

  public useTestRef(name: string): React.MutableRefObject<any> {
    const ref = useRef();
    if (!this.currentTestCase) {
      throw new Error("Undefined test case context");
    }
    this.currentTestCase.componentsRefs[name] = ref;
    return ref;
  }

  public getTestComponent(name: string): TestComponent {
    if (!this.currentTestCase) {
      throw new Error("Undefined test case context");
    }
    return new TestComponent(this.currentTestCase.componentsRefs[name]);
  }

  public async runTests() {
    for (const testSuite of this.testSuites) {
      this.currentTestSuite = testSuite;
      console.log(`+ Running test suite: ${testSuite.name}`);
      console.log(testSuite)
      testSuite.buildSuite();
      if (testSuite.beforeAll) {
        await testSuite.beforeAll();
      }
      for (const testCase of testSuite.testCases) {
        this.currentTestCase = testCase;
        console.log(`\t - Running test case: ${testCase.name}`);
        if (testSuite.beforeEach) {
          await testSuite.beforeEach();
        }
        await testCase.testCase();
        if (testCase.errors.length > 0) {
          console.error(testCase.errors);
          console.log("\t -----------------------------------------------");
        } else {
          console.log("\t ✅ OK");
          console.log("\t -----------------------------------------------");
        }
        if (testSuite.afterEach) {
          await testSuite.afterEach();
        }
        this.currentTestCase = null;
        await render(null);
      }
      if (testSuite.afterAll) {
        await testSuite.afterAll();
      }
      this.currentTestSuite = null;
    }
    this.testSuites = [];
    await unmockAnimationTimer();
    await stopRecordingAnimationUpdates();
    console.log("End of tests run 🏁");
  }

  public expect(value: any) {
    if (!this.currentTestCase) {
      throw new Error("Undefined test case context");
    }
    const errors = this.currentTestCase?.errors;
    return {
      toBe: (expected: any) => {
        if (value !== expected) {
          errors.push(`Expected ${value} received ${expected}`);
        }
      },
      toMatchSnapshot: (expected: any) => {
        if (JSON.stringify(value) !== JSON.stringify(expected)) {
          errors.push(`Expected ${JSON.stringify(value)} received ${JSON.stringify(expected)}`);
        }
      }
    };
  };

  public beforeAll(job: () => void) {
    if (!this.currentTestSuite) {
      throw new Error("Undefined test suite context");
    }
    this.currentTestSuite.beforeAll = job;
  }

  public afterAll(job: () => void) {
    if (!this.currentTestSuite) {
      throw new Error("Undefined test suite context");
    }
    this.currentTestSuite.afterAll = job;
  }

  public beforeEach(job: () => void) {
    if (!this.currentTestSuite) {
      throw new Error("Undefined test suite context");
    }
    this.currentTestSuite.beforeEach = job;
  }

  public afterEach(job: () => void) {
    if (!this.currentTestSuite) {
      throw new Error("Undefined test suite context");
    }
    this.currentTestSuite.afterEach = job;
  }
}

class TestComponent {
  private ref: React.MutableRefObject<any>;
  constructor(ref: React.MutableRefObject<any>) {
    this.ref = ref;
  }
  public getStyle(propName) {
    return this.ref.current.props.style[propName];
  }
  public async getAnimatedStyle(propName) {
    const tag = findNodeHandle(this.ref.current) ?? -1;
    return getViewProp(tag, propName);
  }
  public getTag() {
    return findNodeHandle(this.ref.current) ?? -1;
  }
};

const RunnerState = new TestRunner();

export function describe(name: string, buildSuite: () => void) {
  RunnerState.describe(name, buildSuite);
};

export function beforeAll(job: () => void) {
  RunnerState.beforeAll(job);
}

export function beforeEach(job: () => void) {
  RunnerState.beforeEach(job);
}

export function afterEach(job: () => void) {
  RunnerState.afterEach(job);
}

export function afterAll(job: () => void) {
  RunnerState.afterAll(job);
}

export function test(name: string, testCase: () => void) {
  RunnerState.test(name, testCase);
};

export async function render(component) {
  conditionalWaiting.lock = true;
  renderFnHolder(component);
  return waitForPropertyValueChange(conditionalWaiting, "lock");
}

function waitForPropertyValueChange(targetObject, targetProperty, initialValue = true) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (targetObject[targetProperty] != initialValue) {
        clearInterval(interval);
        resolve(targetObject[targetProperty]);
      }
    }, 10);
  });
}

export function useTestRef(name: string): React.MutableRefObject<any> {
  return RunnerState.useTestRef(name);
}

export function getTestComponent(name: string): TestComponent {
  return RunnerState.getTestComponent(name);
}

export async function runTests() {
  await RunnerState.runTests();
}

export async function wait(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export function expect(value: any) {
  return RunnerState.expect(value);
};

const conditionalWaiting = {
  lock: false,
};
export function setConfig({ render }: { render: (component: any) => void }) {
  renderFnHolder = render;
  return conditionalWaiting;
}

const uiState: any = makeMutable(0);
const lockObject = {
  lock: false
}
function unlock() {
  lockObject.lock = false;
}
async function runOnUiSync(worklet: () => void) {
  // uiState.value = 1;
  // console.log("a")
  // runOnUI(() => {
  //   "worklet";
  //   console.log("b")
  //   worklet();
  //   uiState._value = 2;
  // })();
  // while (uiState.value !== 2) {
  //   console.log("waiting")
  // }
  // console.log("c")
  // uiState.value = 0;
  lockObject.lock = true;
  runOnUI(() => {
    "worklet";
    worklet();
    runOnJS(unlock)();
  })();
  await waitForPropertyValueChange(lockObject, "lock", true);
}

export async function mockAnimationTimer() {
  await runOnUiSync(() => {
    "worklet";
    global.mockedAnimationTimestamp = 0;
    global.originalGetAnimationTimestamp = global._getAnimationTimestamp;
    global._getAnimationTimestamp = () => {
      const currentTimestamp = global.mockedAnimationTimestamp;
      global.__frameTimestamp = currentTimestamp;
      global.mockedAnimationTimestamp += 16;
      return currentTimestamp;
    };
    let originalRequestAnimationFrame = global.requestAnimationFrame;
    global.originalRequestAnimationFrame = originalRequestAnimationFrame;
    (global as any).requestAnimationFrame = (callback) => {
      originalRequestAnimationFrame(() => {
        callback(global._getAnimationTimestamp());
      });
    }
  })
}

export async function unmockAnimationTimer() {
  await runOnUiSync(() => {
    "worklet";
    if (global.originalGetAnimationTimestamp) {
      global._getAnimationTimestamp = global.originalGetAnimationTimestamp;
      global.originalGetAnimationTimestamp = undefined;
    }
    if (global.originalRequestAnimationFrame) {
      global.requestAnimationFrame = global.originalRequestAnimationFrame;
      global.originalRequestAnimationFrame = undefined;
    }
    if (global.mockedAnimationTimestamp) {
      global.mockedAnimationTimestamp = undefined;
    }
  });
}

export async function setAnimationTimestamp(timestamp: number) {
  await runOnUiSync(() => {
    "worklet";
    global.mockedAnimationTimestamp = timestamp;
  })
}

export async function advanceAnimationByTime(time: number) {
  await runOnUiSync(() => {
    "worklet";
    global.mockedAnimationTimestamp += time;
  })
}

export async function advanceAnimationByFrames(frameCount: number) {
  await runOnUiSync(() => {
    "worklet";
    global.mockedAnimationTimestamp += frameCount * 16;
  })
}

export async function recordAnimationUpdates(mergeOperations = true) {
  const updates = makeMutable<any>(null);
  await runOnUiSync(() => {
    "worklet";
    const originalUpdateProps = global._IS_FABRIC ? global._updatePropsFabric : global._updatePropsPaper;
    global.originalUpdateProps = originalUpdateProps;
    const mockedUpdateProps = mergeOperations
      ? (operations) => {
        if (updates.value == null) {
          updates.value = [];
        }
        const newUpdates: any = [];
        for (const operation of operations) {
          newUpdates.push(operation.updates);
        }
        for (const newUpdate of newUpdates) {
          updates.value.push(newUpdate);
        }
        updates.value = [...updates.value];
        originalUpdateProps(operations);
      }
      : (operations) => {
        if (updates.value == null) {
          updates.value = {};
        }
        for (const operation of operations) {
          if (updates.value[operation.tag] == undefined) {
            updates.value[operation.tag] = [];
          }
          updates.value[operation.tag].push(updates.value[operation.tag]);
        }
        updates.value = operations;
      };

    if (global._IS_FABRIC) {
      global._updatePropsFabric = mockedUpdateProps;
    } else {
      global._updatePropsPaper = mockedUpdateProps;
    }
  });
  return updates;
}

export async function stopRecordingAnimationUpdates() {
  await runOnUiSync(() => {
    "worklet";
    if (!global.originalUpdateProps) {
      return;
    }
    if (global._IS_FABRIC) {
      global._updatePropsFabric = global.originalUpdateProps;
    } else {
      global._updatePropsPaper = global.originalUpdateProps;
    }
    global.originalUpdateProps = undefined
  });
}
