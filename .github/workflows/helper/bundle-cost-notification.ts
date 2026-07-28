import fs from 'node:fs';
import path from 'node:path';

import { postToSlack } from './slack.ts';

const REANIMATED = 'react-native-reanimated';
const WORKLETS = 'react-native-worklets';

type PlatformResult = {
  total: number;
  gzip: number;
  groups: Record<string, number>;
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
        files.push(JSON.parse(fs.readFileSync(full, 'utf8')) as ResultFile);
      }
    }
  };
  walk(dir);
  return files;
}

function formatMessage(results: ResultFile[], runUrl: string): string {
  const lines: string[] = ['*Nightly bundle cost*'];

  const byVersion = new Map<string, ResultFile[]>();
  for (const result of results) {
    const existing = byVersion.get(result.reanimatedVersion) ?? [];
    existing.push(result);
    byVersion.set(result.reanimatedVersion, existing);
  }

  const versions = [...byVersion.keys()].sort().reverse();

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
            `reanimated ${mb(reanimated).padStart(8)}  ` +
            `worklets ${mb(worklets).padStart(8)}`
        );
      }
    }

    lines.push(
      `\n*reanimated ${version}* + worklets ${workletsVersion} (RN ${reactNativeVersion})` +
        '\n```\n' +
        body.join('\n') +
        '\n```'
    );
  }

  lines.push(`\n<${runUrl}|Workflow run>`);
  return lines.join('\n');
}

async function main(): Promise<void> {
  const dir = process.argv[2] ?? '/tmp/bundle-cost-results';
  const results = readResults(dir);
  const runUrl =
    process.env.RUN_URL ??
    'https://github.com/software-mansion/react-native-reanimated/actions';

  if (results.length === 0) {
    await postToSlack({
      text:
        '*Nightly bundle cost*\nNo results were produced — every measure job ' +
        `failed or uploaded nothing.\n<${runUrl}|Workflow run>`,
    });
    return;
  }

  await postToSlack({ text: formatMessage(results, runUrl) });
}

await main();
