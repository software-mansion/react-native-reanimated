import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';
import { TestSummaryLogger } from '../../ReJest/TestRunner/TestSummaryLogger';
import type { TestCase, TestSuite } from '../../ReJest/types';

describe('Failure summary', () => {
  test('collects the suite path and the errors of every failed test', () => {
    const logger = new TestSummaryLogger();
    const originalLog = console.log;
    console.log = () => {};
    try {
      logger.enterTestSuite(suite('outer', 1));
      logger.enterTestSuite(suite('inner', 2));
      logger.logRunningTestSuite(suite('inner', 2));
      logger.showTestCaseSummary(
        testCase('fails inside', ['Expected 1 received 2']),
        2
      );
      logger.showTestCaseSummary(testCase('passes inside', []), 2);
      logger.enterTestSuite(suite('sibling', 1));
      logger.logRunningTestSuite(suite('sibling', 1));
      logger.showTestCaseSummary(
        testCase('fails twice', ['first', 'second']),
        1
      );
    } finally {
      console.log = originalLog;
    }

    const summary = logger.getSummary();
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(2);
    expect(JSON.stringify(summary.failedTests)).toBe(
      JSON.stringify(['fails inside', 'fails twice'])
    );
    expect(JSON.stringify(summary.failures)).toBe(
      JSON.stringify([
        {
          suite: 'outer › inner',
          name: 'fails inside',
          errors: ['Expected 1 received 2'],
        },
        { suite: 'sibling', name: 'fails twice', errors: ['first', 'second'] },
      ])
    );
  });
});

function suite(name: string, nestingLevel: number): TestSuite {
  return { name, nestingLevel, buildSuite: () => {}, testCases: [] };
}

function testCase(name: string, errors: string[]): TestCase {
  return { name, errors, run: () => {}, componentsRefs: {}, callsRegistry: {} };
}
