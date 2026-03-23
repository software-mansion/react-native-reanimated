import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type BadgeStatus = 'failing' | 'passing' | 'unknown';

type BadgeInfo = {
  name: string;
  badgeUrl?: string;
  workflowUrl?: string;
};

type BadgeResult = BadgeInfo & {
  status: BadgeStatus;
};

const GITHUB_ACTIONS_BADGE_REGEX =
  // @ts-expect-error It's fine to use capture groups here.
  /\[!\[(?<name>[^\]]+)\]\((?<badgeUrl>https:\/\/github\.com\/software-mansion\/react-native-reanimated\/actions\/workflows\/[^)]+\/badge\.svg[^)]*)\)\]\((?<workflowUrl>https:\/\/github\.com\/software-mansion\/react-native-reanimated\/actions\/workflows\/[^)]+)\)/g;

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

function formatSlackMessage(failingBadges: BadgeResult[]): string {
  if (failingBadges.length === 0) {
    return '✅ All GitHub Actions badges from README are passing.';
  }

  const lines = failingBadges.map(
    (badge) => `• ${badge.name}: ${badge.workflowUrl}`
  );

  return ['❌ Failing GitHub Actions badges found:', ...lines].join('\n');
}

export async function postToSlack({ text }: { text: string }): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) throw new Error('SLACK_WEBHOOK_URL is required');
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Slack webhook error ${res.status}: ${t.slice(0, 400)}`);
  }
}

async function main(): Promise<void> {
  const badges = await getActionsBadgesFromReadme();
  const failingBadges = await getFailingBadges(badges);
  const text = formatSlackMessage(failingBadges);

  await postToSlack({ text });
}

main().catch((err: unknown) => {
  console.error('Error posting GitHub Actions badge status to Slack:', err);
  process.exitCode = 1;
});
