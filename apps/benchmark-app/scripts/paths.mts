import path from 'node:path';

export const APP_DIR = path.resolve(import.meta.dirname, '..');
export const REPOSITORY_ROOT = path.resolve(APP_DIR, '..', '..');
export const BENCHMARKS_DIR = path.join(REPOSITORY_ROOT, '.tmp', 'benchmarks');
export const DEFAULT_OUTPUT_DIR = path.join(BENCHMARKS_DIR, 'runs');
export const BUILDS_DIR = path.join(BENCHMARKS_DIR, 'builds');
export const SAMPLES_DIR = path.join(BENCHMARKS_DIR, 'samples');
