import type { BuildFunction, TestCase, TestSuite } from '../types';
import { DescribeDecorator, TestDecorator } from '../types';
import { applyMarkdown, formatTestName } from '../utils/stringFormatUtils';
import { assertTestSuite, assertTestCase } from './Asserts';

class TestSuiteManager {
  _testSuites: TestSuite[] = [];
  _currentTestSuite: TestSuite | null = null;
}

/**
 * Before the initiation of test run any external modification of current test Suite is forbidden.
 * We track the currentTestSuite to correctly handle nesting of test suite with nested describe calls.
 */
export class TestSuitePreExecutionManager extends TestSuiteManager {
  _includesOnly: boolean = false;

  public describe(name: string, buildSuite: BuildFunction, decorator: DescribeDecorator | null) {
    if (decorator === DescribeDecorator.ONLY) {
      this._includesOnly = true;
    }

    let index: number; // We have to manage the order of the nested describes
    if (this._currentTestSuite === null) {
      index = this._testSuites.length; // If we have no parent describe, we append at the end
    } else {
      const parentIndex = this._testSuites.findIndex(testSuite => {
        return testSuite === this._currentTestSuite;
      });
      const parentNesting = this._currentTestSuite.nestingLevel;
      index = parentIndex + 1;
      while (index < this._testSuites.length && this._testSuites[index].nestingLevel > parentNesting) {
        // Append after last child of the parent describe
        // The children have bigger nesting level
        index += 1;
      }
    }

    const suiteDecorator = decorator || this._currentTestSuite?.decorator;

    this._testSuites.splice(index, 0, {
      name: applyMarkdown(name),
      buildSuite,
      testCases: [],
      nestingLevel: (this._currentTestSuite?.nestingLevel || 0) + 1,
      decorator: suiteDecorator || null,
      skip: !!(suiteDecorator === DescribeDecorator.SKIP),
    });
  }

  public test(name: string, run: BuildFunction, decorator: TestDecorator | null) {
    assertTestSuite(this._currentTestSuite);
    if (decorator === TestDecorator.ONLY) {
      this._includesOnly = true;
    }
    this._currentTestSuite.testCases.push({
      name: applyMarkdown(name),
      run,
      componentsRefs: {},
      callsRegistry: {},
      errors: [],
      skip: decorator === TestDecorator.SKIP || this._currentTestSuite.decorator === DescribeDecorator.SKIP,
      decorator,
    });
  }

  public testEach<T>(examples: Array<T>, decorator: TestDecorator | null) {
    return (name: string, testCase: (example: T, index: number) => void | Promise<void>) => {
      examples.forEach((example, index) => {
        const currentTestCase = async () => {
          await testCase(example, index);
        };
        this.test(formatTestName(name, example, index), currentTestCase, decorator);
      });
    };
  }

  public setSkipFlags() {
    for (const testSuite of this._testSuites) {
      let skipTestSuite = testSuite.skip;

      if (this._includesOnly) {
        skipTestSuite = skipTestSuite || !(testSuite.decorator === DescribeDecorator.ONLY);

        for (const testCase of testSuite.testCases) {
          if (testCase.decorator === TestDecorator.ONLY) {
            skipTestSuite = false;
          } else {
            testCase.skip = testCase.skip || !(testSuite.decorator === DescribeDecorator.ONLY);
          }
        }
      }
      testSuite.skip = skipTestSuite;
    }
  }

  public async buildSuites() {
    for (const testSuite of this._testSuites) {
      this._currentTestSuite = testSuite;
      await testSuite.buildSuite();
      this._currentTestSuite = null;
    }
  }

  public setJob(jobType: 'beforeAll' | 'afterAll' | 'beforeEach' | 'afterEach', job: () => void) {
    assertTestSuite(this._currentTestSuite);
    this._currentTestSuite[jobType] = job;
  }
}

/**
 * After starting tests adding more tests with `describe` or `test` functions is not enabled.
 *
 */
export class TestSuiteExecutionManager extends TestSuiteManager {
  _currentTestCase: TestCase | null = null;

  constructor(preExecutionManager: TestSuitePreExecutionManager) {
    super();
    this._testSuites = preExecutionManager._testSuites;
    this._currentTestSuite = preExecutionManager._currentTestSuite;
  }

  public getTestSuites() {
    return this._testSuites;
  }

  public getCurrentTestCase(): TestCase {
    assertTestCase(this._currentTestCase);
    return this._currentTestCase;
  }

  public getCurrentTestSuite(): TestSuite {
    assertTestSuite(this._currentTestSuite);
    return this._currentTestSuite;
  }

  public setCurrentTestCase(testCase: TestCase) {
    this._currentTestCase = testCase;
  }

  public resetCurrentTestCase() {
    this._currentTestCase = null;
  }

  public setCurrentTestSuite(testSuite: TestSuite) {
    this._currentTestSuite = testSuite;
  }

  public resetCurrentTestSuite() {
    this._currentTestSuite = null;
  }
}
