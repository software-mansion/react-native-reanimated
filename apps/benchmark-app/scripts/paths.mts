import path from 'node:path';

export const APP_DIR = path.resolve(import.meta.dirname, '..');

export const REPOSITORY_ROOT = path.resolve(APP_DIR, '..', '..');

const BENCHMARKS_DIR = path.join(REPOSITORY_ROOT, '.tmp', 'benchmarks');

export const DEFAULT_OUTPUT_DIR = path.join(BENCHMARKS_DIR, 'runs');

export const BUILDS_DIR = path.join(BENCHMARKS_DIR, 'builds');

export const SAMPLES_DIR = path.join(BENCHMARKS_DIR, 'samples');

export const VALIDATION_DIR = path.join(BENCHMARKS_DIR, 'validation');

export const RESULT_FILE = 'result.json';

export const REPORT_FILE = 'report.md';

export const SUMMARY_FILE = 'summary.json';
