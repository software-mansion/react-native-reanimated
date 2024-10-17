import type { TestCase, TestSuite } from '../types';
import { color, EMPTY_LOG_PLACEHOLDER, indentNestingLevel } from '../utils/stringFormatUtils';

export class TestSummaryLogger {
  private _passed: number = 0;
  private _failed: number = 0;
  private _skipped: number = 0;
  private _failedTests: Array<string> = [];
  private _startTime: number = Date.now();

  public logRunningTestSuite(testSuite: TestSuite) {
    console.log(`${indentNestingLevel(testSuite.nestingLevel)}${testSuite.name}`);
  }

  public showTestCaseSummary(testCase: TestCase, nestingLevel: number) {
    let mark;
    if (testCase.errors.length > 0) {
      this._failed++;
      this._failedTests.push(testCase.name);
      mark = color('✖', 'red');
    } else {
      this._passed++;
      mark = color('✔', 'green');
    }
    console.log(`${indentNestingLevel(nestingLevel)} ${mark} ${color(testCase.name, 'gray')}`);

    for (const error of testCase.errors) {
      const indentedError = error.replace(/\n/g, '\n' + EMPTY_LOG_PLACEHOLDER + indentNestingLevel(nestingLevel + 2));
      console.log(`${indentNestingLevel(nestingLevel)}\t${indentedError}`);
    }
  }

  public countSkippedTestSuiteTests(testSuite: TestSuite) {
    if (testSuite.skip) {
      this._skipped += testSuite.testCases.length;
      return;
    }
    for (const testCase of testSuite.testCases) {
      if (testCase.skip) {
        this._skipped++;
      }
    }
  }

  public printSummary() {
    const endTime = Date.now();
    const timeInSeconds = Math.round((endTime - this._startTime) / 1000);

    console.log('End of tests run 🏁');
    console.log('\n');
    console.log(
      `🧮 Tests summary: ${color(this._passed, 'green')} passed, ${color(this._failed, 'red')} failed, ${color(
        this._skipped,
        'orange',
      )} skipped`,
    );
    console.log(`⏱️  Total time: ${Math.floor(timeInSeconds / 60)} minutes ${timeInSeconds % 60} s`);

    if (this._failed > 0) {
      console.log('❌ Failed tests:');
      for (const failedTest of this._failedTests) {
        console.log(`\t• ${failedTest}`);
      }
    } else {
      console.log('✅ All tests passed!');
    }
    console.log('\n');
  }

  public allTestsPassed() {
    return this._failed === 0;
  }
}
