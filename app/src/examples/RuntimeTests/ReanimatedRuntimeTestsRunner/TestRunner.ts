import { useRef } from "react";
import { TestCase, TestSuite } from "./types";
import { TestComponent } from "./TestComponent";
import { render, stopRecordingAnimationUpdates, unmockAnimationTimer } from "./RuntimeTestsApi";

export class TestRunner {
  private testSuites: TestSuite[] = [];
  private currentTestSuite: TestSuite | null = null;
  private currentTestCase: TestCase | null = null;
  private renderHook: (component: any) => void = () => {};
  private renderLock: { lock: boolean } = { lock: false };

  public configure(config: { render: (component: any) => void }) {
    this.renderHook = config.render;
    return this.renderLock;
  }

  public async render(component: any) {
    this.renderLock.lock = true;
    this.renderHook(component);
    return this.waitForPropertyValueChange(this.renderLock, "lock");
  }

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

  private waitForPropertyValueChange(targetObject, targetProperty, initialValue = true) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (targetObject[targetProperty] != initialValue) {
          clearInterval(interval);
          resolve(targetObject[targetProperty]);
        }
      }, 10);
    });
  }
}
