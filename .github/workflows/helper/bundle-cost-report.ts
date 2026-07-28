import fs from 'node:fs';
import path from 'node:path';

const REANIMATED = 'react-native-reanimated';
const WORKLETS = 'react-native-worklets';

type PlatformResult = {
  total: number;
  gzip: number;
  groups: Record<string, number>;
};

type ExpectedJob = {
  reanimatedVersion: string;
  workletsVersion: string;
  bundleMode: boolean;
};

type ResultFile = {
  reanimatedVersion: string;
  workletsVersion: string;
  reactNativeVersion: string;
  bundleMode: boolean;
  results: Record<string, PlatformResult>;
};

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function parseResultFile(file: string): ResultFile | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as ResultFile;
    if (
      typeof parsed?.reanimatedVersion !== 'string' ||
      typeof parsed?.bundleMode !== 'boolean' ||
      typeof parsed?.results !== 'object' ||
      parsed.results === null
    ) {
      throw new Error('unexpected shape');
    }
    return parsed;
  } catch (error) {
    console.error(`ignoring ${file}: ${String(error)}`);
    return null;
  }
}

function readResults(dir: string): ResultFile[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files: ResultFile[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.json')) {
        const parsed = parseResultFile(full);
        if (parsed) {
          files.push(parsed);
        }
      }
    }
  };
  walk(dir);
  return files;
}

function compareVersionsDesc(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (right[i] ?? 0) - (left[i] ?? 0);
    if (diff) {
      return diff;
    }
  }
  return 0;
}

function jobKey(reanimatedVersion: string, bundleMode: boolean): string {
  return `${reanimatedVersion} bundle-mode=${bundleMode}`;
}

function readExpectedJobs(): ExpectedJob[] {
  const raw = process.env.EXPECTED_MATRIX;
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as ExpectedJob[];
  } catch {
    return [];
  }
}

function missingJobs(results: ResultFile[]): string[] {
  const measured = new Set(
    results.map((result) => jobKey(result.reanimatedVersion, result.bundleMode))
  );
  return readExpectedJobs()
    .map((job) => jobKey(job.reanimatedVersion, job.bundleMode))
    .filter((key) => !measured.has(key));
}

function formatMessage(results: ResultFile[], runUrl: string): string {
  const lines: string[] = ['*Nightly bundle cost*'];

  const byVersion = new Map<string, ResultFile[]>();
  for (const result of results) {
    const existing = byVersion.get(result.reanimatedVersion) ?? [];
    existing.push(result);
    byVersion.set(result.reanimatedVersion, existing);
  }

  const versions = [...byVersion.keys()].sort(compareVersionsDesc);

  for (const version of versions) {
    const entries = byVersion.get(version)!;
    const { workletsVersion, reactNativeVersion } = entries[0];
    const body: string[] = [];

    for (const entry of entries.sort(
      (a, b) => Number(b.bundleMode) - Number(a.bundleMode)
    )) {
      for (const [platform, result] of Object.entries(entry.results).sort()) {
        const reanimated = result.groups[REANIMATED] ?? 0;
        const worklets = result.groups[WORKLETS] ?? 0;
        body.push(
          `${platform.padEnd(8)} bundle-mode=${String(entry.bundleMode).padEnd(6)} ` +
            `total ${mb(result.total).padStart(8)}  ` +
            `gzip ${mb(result.gzip).padStart(8)}  ` +
            `reanimated ${mb(reanimated).padStart(8)}  ` +
            `worklets ${mb(worklets).padStart(8)}`
        );
      }
    }

    lines.push(
      `\n*reanimated ${version}* + worklets ${workletsVersion} (app RN ${reactNativeVersion})` +
        '\n```\n' +
        body.join('\n') +
        '\n```'
    );
  }

  lines.push(`\n<${runUrl}|Workflow run>`);
  return lines.join('\n');
}

export function buildBundleCostSection(
  dir = process.env.BUNDLE_COST_DIR ?? '/tmp/bundle-cost-results'
): string {
  const runUrl =
    process.env.RUN_URL ??
    'https://github.com/software-mansion/react-native-reanimated/actions';
  const failureText = `*Nightly bundle cost*\nThe run failed, check the CI logs.\n<${runUrl}|Workflow run>`;

  try {
    const results = readResults(dir);
    const failed =
      process.env.MEASURE_RESULT !== 'success' ||
      results.length === 0 ||
      missingJobs(results).length > 0;
    return failed ? failureText : formatMessage(results, runUrl);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
    return failureText;
  }
}
