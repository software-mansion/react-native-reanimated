#!/bin/bash
set -euo pipefail

cd packages/react-native-reanimated

# Run tests with JSON output to get timing and pass/fail counts
RESULT=$(yarn test --no-cache --forceExit --json 2>/dev/null || true)

# Parse results
TOTAL_TIME=$(echo "$RESULT" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if 'testResults' in d:
            # Wall clock from Jest
            start = d.get('startTime', 0)
            # Calculate total from test results
            total_ms = 0
            for r in d['testResults']:
                total_ms = max(total_ms, r.get('endTime', 0) - start)
            print(f\"{total_ms / 1000:.3f}\")
            break
    except:
        continue
" 2>/dev/null || echo "0")

TESTS_PASSED=$(echo "$RESULT" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if 'numPassedTests' in d:
            print(d['numPassedTests'])
            break
    except:
        continue
" 2>/dev/null || echo "0")

SUITES_PASSED=$(echo "$RESULT" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if 'numPassedTestSuites' in d:
            print(d['numPassedTestSuites'])
            break
    except:
        continue
" 2>/dev/null || echo "0")

TESTS_FAILED=$(echo "$RESULT" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if 'numFailedTests' in d:
            print(d['numFailedTests'])
            break
    except:
        continue
" 2>/dev/null || echo "0")

SUITES_FAILED=$(echo "$RESULT" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
        if 'numFailedTestSuites' in d:
            print(d['numFailedTestSuites'])
            break
    except:
        continue
" 2>/dev/null || echo "0")

echo "METRIC total_s=${TOTAL_TIME}"
echo "METRIC tests_passed=${TESTS_PASSED}"
echo "METRIC suites_passed=${SUITES_PASSED}"
echo "METRIC tests_failed=${TESTS_FAILED}"
echo "METRIC suites_failed=${SUITES_FAILED}"

# Fail if any tests failed
if [ "$TESTS_FAILED" != "0" ] || [ "$SUITES_FAILED" != "0" ]; then
    echo "ERROR: ${TESTS_FAILED} tests failed in ${SUITES_FAILED} suites"
    exit 1
fi
