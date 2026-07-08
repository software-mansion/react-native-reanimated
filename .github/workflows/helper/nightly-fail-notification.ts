import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { postToSlack } from './slack.ts';

type BadgeStatus = 'failing' | 'passing' | 'unknown';

type BadgeInfo = {
  name: string;
  badgeUrl?: string;
  workflowUrl?: string;
};

type BadgeResult = BadgeInfo & {
  status: BadgeStatus;
};

type NightlyDailyResult = {
  android?: string;
  ios?: string;
};

type NightlyLibraryEntry = {
  library: string;
  results?: Record<string, NightlyDailyResult>;
};

type NightlyFailure = {
  library: string;
  platform: 'iOS' | 'Android';
  date: string;
};

type NightlyStatus =
  | { kind: 'ok'; failures: NightlyFailure[] }
  | { kind: 'unknown' };

const GITHUB_ACTIONS_BADGE_REGEX =
  /\[!\[(?<name>(?:[^[\]]|\[[^\]]*\])+)\]\((?<badgeUrl>https:\/\/github\.com\/software-mansion\/react-native-reanimated\/actions\/workflows\/[^)]+\/badge\.svg[^)]*)\)\]\((?<workflowUrl>https:\/\/github\.com\/software-mansion\/react-native-reanimated\/actions\/workflows\/[^)]+)\)/g;

const NIGHTLY_TESTS_DATA_URL =
  'https://react-native-community.github.io/nightly-tests/data.json';
const NIGHTLY_TESTS_WEBSITE_URL =
  'https://react-native-community.github.io/nightly-tests/';
const NIGHTLY_TRACKED_LIBRARIES = [
  'react-native-reanimated',
  'react-native-worklets',
];

function parseBadgeStatus(svg: string): BadgeStatus {
  const normalized = svg.toLowerCase();

  if (normalized.includes('failing')) return 'failing';
  if (normalized.includes('failure')) return 'failing';
  if (normalized.includes('failed')) return 'failing';
  if (normalized.includes('passing')) return 'passing';
  if (normalized.includes('success')) return 'passing';

  return 'unknown';
}

async function getActionsBadgesFromReadme(): Promise<BadgeInfo[]> {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  const readmePath = path.resolve(currentDir, '../../../README.md');
  const readmeContent = await fs.readFile(readmePath, 'utf8');

  return Array.from(readmeContent.matchAll(GITHUB_ACTIONS_BADGE_REGEX)).map(
    (match): BadgeInfo => ({
      name: match.groups?.name ?? 'Unknown workflow',
      badgeUrl: match.groups?.badgeUrl,
      workflowUrl: match.groups?.workflowUrl,
    })
  );
}

async function getFailingBadges(badges: BadgeInfo[]): Promise<BadgeResult[]> {
  const results = await Promise.all(
    badges.map(async (badge): Promise<BadgeResult> => {
      if (!badge.badgeUrl || !badge.workflowUrl) {
        return { ...badge, status: 'unknown' };
      }

      try {
        const response = await fetch(badge.badgeUrl);
        if (!response.ok) {
          return { ...badge, status: 'unknown' };
        }

        const svg = await response.text();
        const status = parseBadgeStatus(svg);
        return { ...badge, status };
      } catch {
        return { ...badge, status: 'unknown' };
      }
    })
  );

  return results.filter((result) => result.status === 'failing');
}

async function getRNNightlyFailures(): Promise<NightlyStatus> {
  let data: NightlyLibraryEntry[];

  try {
    const response = await fetch(NIGHTLY_TESTS_DATA_URL);
    if (!response.ok) return { kind: 'unknown' };
    data = (await response.json()) as NightlyLibraryEntry[];
  } catch {
    return { kind: 'unknown' };
  }

  const failures: NightlyFailure[] = [];

  for (const library of NIGHTLY_TRACKED_LIBRARIES) {
    const entry = data.find((item) => item.library === library);
    if (!entry?.results) continue;

    const latestDate = Object.keys(entry.results).sort().at(-1);
    if (!latestDate) continue;

    const result = entry.results[latestDate];
    if (result.ios === 'failure') {
      failures.push({ library, platform: 'iOS', date: latestDate });
    }
    if (result.android === 'failure') {
      failures.push({ library, platform: 'Android', date: latestDate });
    }
  }

  return { kind: 'ok', failures };
}

function formatSlackMessage(
  failingBadges: BadgeResult[],
  nightly: NightlyStatus
): string {
  const sections: string[] = [];

  if (failingBadges.length > 0) {
    const lines = failingBadges.map(
      (badge) => `• ${badge.name}: ${badge.workflowUrl}`
    );
    sections.push(
      ['❌ Failing GitHub Actions badges found:', ...lines].join('\n')
    );
  }

  if (nightly.kind === 'unknown') {
    sections.push(
      [
        '⚠️ Could not fetch React Native nightly test data (react-native-community/nightly-tests) — status unknown:',
        NIGHTLY_TESTS_WEBSITE_URL,
      ].join('\n')
    );
  } else if (nightly.failures.length > 0) {
    const lines = nightly.failures.map(
      (failure) =>
        `• ${failure.library} (${failure.platform}) — nightly ${failure.date}`
    );
    sections.push(
      [
        '❌ Failing React Native nightly tests (react-native-community/nightly-tests):',
        ...lines,
        NIGHTLY_TESTS_WEBSITE_URL,
      ].join('\n')
    );
  }

  if (sections.length === 0) {
    return '✅ All README GitHub Actions badges are passing and Reanimated & Worklets pass the latest React Native nightly tests.';
  }

  return sections.join('\n\n');
}

async function main(): Promise<void> {
  const badges = await getActionsBadgesFromReadme();
  const [failingBadges, nightly] = await Promise.all([
    getFailingBadges(badges),
    getRNNightlyFailures(),
  ]);
  const text = formatSlackMessage(failingBadges, nightly);

  await postToSlack({ text });
}

main().catch((err: unknown) => {
  console.error('Error posting GitHub Actions badge status to Slack:', err);
  process.exitCode = 1;
});
