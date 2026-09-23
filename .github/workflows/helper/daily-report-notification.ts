import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildBundleCostSection } from './bundle-cost-report.ts';
import { postToSlack } from './slack.ts';

async function main(): Promise<void> {
  const badges = await getActionsBadgesFromReadme();
  const [failingBadges, nightly, digest] = await Promise.all([
    getFailingBadges(badges),
    getRNNightlyFailures(),
    getDailyDigest(),
  ]);
  const text = [
    formatSlackMessage(failingBadges, nightly),
    formatDigestSection(digest),
    buildBundleCostSection(),
  ].join('\n\n');

  await postToSlack({ text });
}

const GITHUB_ACTIONS_BADGE_REGEX =
  /\[!\[(?<name>(?:[^[\]]|\[[^\]]*\])+)\]\((?<badgeUrl>https:\/\/github\.com\/software-mansion\/react-native-reanimated\/actions\/workflows\/[^)]+\/badge\.svg[^)]*)\)\]\((?<workflowUrl>https:\/\/github\.com\/software-mansion\/react-native-reanimated\/actions\/workflows\/[^)]+)\)/g;

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

  const failing = results.filter((result) => result.status === 'failing');

  return Promise.all(
    failing.map(async (badge) => ({
      ...badge,
      run: await getFailingRun(badge),
    }))
  );
}

function parseBadgeStatus(svg: string): BadgeStatus {
  const normalized = svg.toLowerCase();

  if (normalized.includes('failing')) return 'failing';
  if (normalized.includes('failure')) return 'failing';
  if (normalized.includes('failed')) return 'failing';
  if (normalized.includes('passing')) return 'passing';
  if (normalized.includes('success')) return 'passing';

  return 'unknown';
}

async function getFailingRun(
  badge: BadgeInfo
): Promise<FailingRun | undefined> {
  if (!badge.workflowUrl) {
    return undefined;
  }

  const ref = parseWorkflowUrl(badge.workflowUrl);
  if (!ref) {
    return undefined;
  }

  // A badge without filters reflects the default branch; `?branch=`/`?event=`
  // narrow it down, so the run lookup has to use the same filters.
  const badgeFilters = new URLSearchParams(
    badge.badgeUrl ? new URL(badge.badgeUrl).search : ''
  );
  const query = new URLSearchParams({ status: 'completed' });
  query.set('per_page', '1');
  const branch = badgeFilters.get('branch') ?? (await getDefaultBranch(ref));
  if (branch) {
    query.set('branch', branch);
  }
  const event = badgeFilters.get('event');
  if (event) {
    query.set('event', event);
  }

  const response = await githubApi<{ workflow_runs?: WorkflowRun[] }>(
    `/repos/${ref.owner}/${ref.repo}/actions/workflows/${ref.file}/runs?${query.toString()}`
  );

  const run = response?.workflow_runs?.[0];
  if (!run?.html_url || run.conclusion === 'success') {
    return undefined;
  }

  const attempt = run.run_attempt ?? 1;
  return {
    url: run.html_url,
    label:
      `run #${run.run_number ?? run.id}` +
      (attempt > 1 ? ` (attempt ${attempt})` : ''),
    failedJobs: await getFailedJobs(ref, run.id),
  };
}

function parseWorkflowUrl(workflowUrl: string): WorkflowRef | null {
  let parsed: URL;
  try {
    parsed = new URL(workflowUrl);
  } catch {
    return null;
  }

  const match = parsed.pathname.match(
    /^\/([^/]+)\/([^/]+)\/actions\/workflows\/([^/]+)$/
  );
  if (!match) {
    return null;
  }

  return { owner: match[1], repo: match[2], file: match[3] };
}

const defaultBranches = new Map<string, Promise<string | null>>();

function getDefaultBranch(ref: WorkflowRef): Promise<string | null> {
  const key = `${ref.owner}/${ref.repo}`;
  let branch = defaultBranches.get(key);
  if (!branch) {
    branch = githubApi<{ default_branch?: string }>(`/repos/${key}`).then(
      (repository) => repository?.default_branch ?? null
    );
    defaultBranches.set(key, branch);
  }
  return branch;
}

const NON_FAILING_JOB_CONCLUSIONS = ['success', 'skipped', 'neutral'];

async function getFailedJobs(
  ref: WorkflowRef,
  runId: number
): Promise<FailedJob[]> {
  const response = await githubApi<{ jobs?: WorkflowJob[] }>(
    `/repos/${ref.owner}/${ref.repo}/actions/runs/${runId}/jobs?filter=latest&per_page=100`
  );

  return (response?.jobs ?? [])
    .filter(
      (job) =>
        job.html_url &&
        job.conclusion &&
        !NON_FAILING_JOB_CONCLUSIONS.includes(job.conclusion)
    )
    .map((job) => ({ name: job.name ?? 'unnamed job', url: job.html_url! }));
}

const GITHUB_API_URL = process.env.GITHUB_API_URL ?? 'https://api.github.com';

async function githubApi<T>(pathWithQuery: string): Promise<T | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(`${GITHUB_API_URL}${pathWithQuery}`, {
      headers,
    });
    if (!response.ok) {
      console.error(`GitHub API ${pathWithQuery} responded ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`GitHub API ${pathWithQuery} failed: ${String(error)}`);
    return null;
  }
}

const NIGHTLY_TESTS_DATA_URL =
  'https://react-native-community.github.io/nightly-tests/data.json';
const NIGHTLY_TRACKED_LIBRARIES = [
  'react-native-reanimated',
  'react-native-worklets',
];

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

const DIGEST_REPO = 'software-mansion/react-native-reanimated';
const DIGEST_WINDOW_HOURS = 24;
const DIGEST_LIST_LIMIT = 100;

async function getDailyDigest(): Promise<DigestStatus> {
  const since = new Date(Date.now() - DIGEST_WINDOW_HOURS * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z');

  const [
    mergedPullRequests,
    newIssues,
    closedIssues,
    openPullRequests,
    openIssues,
  ] = await Promise.all([
    searchDigestItems(
      `repo:${DIGEST_REPO} type:pr is:merged merged:>=${since}`
    ),
    searchDigestItems(
      `repo:${DIGEST_REPO} type:issue is:open created:>=${since}`
    ),
    searchDigestItems(
      `repo:${DIGEST_REPO} type:issue is:closed closed:>=${since}`
    ),
    countMatches(`repo:${DIGEST_REPO} type:pr is:open`),
    countMatches(`repo:${DIGEST_REPO} type:issue is:open`),
  ]);

  if (
    !mergedPullRequests ||
    !newIssues ||
    !closedIssues ||
    openPullRequests === null ||
    openIssues === null
  ) {
    return { kind: 'unknown' };
  }

  return {
    kind: 'ok',
    digest: {
      mergedPullRequests,
      newIssues,
      closedIssues: annotateOpenedInWindow(closedIssues, since),
      openPullRequests,
      openIssues,
    },
  };
}

async function searchDigestItems(
  query: string
): Promise<DigestCategory | null> {
  const response = await githubApi<IssueSearchResponse>(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=${DIGEST_LIST_LIMIT}`
  );
  if (!response) {
    return null;
  }

  return {
    total: response.total_count,
    items: response.items.map((item) => ({
      number: item.number,
      title: item.title,
      url: item.html_url,
      createdAt: item.created_at,
    })),
  };
}

async function countMatches(query: string): Promise<number | null> {
  const response = await githubApi<IssueSearchResponse>(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=1`
  );
  return response ? response.total_count : null;
}

function annotateOpenedInWindow(
  category: DigestCategory,
  since: string
): DigestCategory {
  const cutoff = new Date(since).getTime();
  return {
    total: category.total,
    items: category.items.map((item) =>
      new Date(item.createdAt).getTime() >= cutoff
        ? { ...item, note: 'opened same day' }
        : item
    ),
  };
}

const NIGHTLY_TESTS_WEBSITE_URL =
  'https://react-native-community.github.io/nightly-tests/';

function formatSlackMessage(
  failingBadges: BadgeResult[],
  nightly: NightlyStatus
): string {
  const sections: string[] = [];

  if (failingBadges.length > 0) {
    const lines = failingBadges.flatMap((badge) => formatFailingBadge(badge));
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

const MAX_LISTED_JOBS = 5;

function formatFailingBadge(badge: BadgeResult): string[] {
  if (!badge.run) {
    return [`• ${badge.name}: ${badge.workflowUrl}`];
  }

  const lines = [`• ${badge.name}: <${badge.run.url}|${badge.run.label}>`];

  for (const job of badge.run.failedJobs.slice(0, MAX_LISTED_JOBS)) {
    lines.push(`    ◦ <${job.url}|${job.name}>`);
  }

  const hidden = badge.run.failedJobs.length - MAX_LISTED_JOBS;
  if (hidden > 0) {
    lines.push(`    ◦ …and ${hidden} more failing job(s)`);
  }

  return lines;
}

function formatDigestSection(status: DigestStatus): string {
  if (status.kind === 'unknown') {
    return [
      '*Daily digest (last 24h)*',
      '⚠️ Could not fetch repository activity from the GitHub API.',
    ].join('\n');
  }

  const {
    mergedPullRequests,
    newIssues,
    closedIssues,
    openPullRequests,
    openIssues,
  } = status.digest;
  return [
    '*Daily digest (last 24h)*',
    formatDigestCategory('🔀 Merged pull requests', mergedPullRequests),
    formatDigestCategory('🆕 New issues', newIssues),
    formatDigestCategory('☑️ Closed issues', closedIssues),
    `📂 Currently open: ${openPullRequests} pull requests · ${openIssues} issues`,
  ].join('\n\n');
}

function formatDigestCategory(
  heading: string,
  category: DigestCategory
): string {
  const lines = [`${heading}: ${category.total}`];

  for (const item of category.items) {
    const note = item.note ? ` — ${item.note}` : '';
    lines.push(
      `• <${item.url}|#${item.number}> ${escapeSlackText(item.title)}${note}`
    );
  }

  const hidden = category.total - category.items.length;
  if (hidden > 0) {
    lines.push(`• …and ${hidden} more`);
  }

  return lines.join('\n');
}

function escapeSlackText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

main().catch((err: unknown) => {
  console.error('Error posting daily report to Slack:', err);
  process.exitCode = 1;
});

type BadgeStatus = 'failing' | 'passing' | 'unknown';

type BadgeInfo = {
  name: string;
  badgeUrl?: string;
  workflowUrl?: string;
};

type FailedJob = {
  name: string;
  url: string;
};

type FailingRun = {
  url: string;
  label: string;
  failedJobs: FailedJob[];
};

type BadgeResult = BadgeInfo & {
  status: BadgeStatus;
  run?: FailingRun;
};

type WorkflowRef = {
  owner: string;
  repo: string;
  file: string;
};

type WorkflowRun = {
  id: number;
  html_url?: string | null;
  conclusion?: string | null;
  run_number?: number;
  run_attempt?: number;
};

type WorkflowJob = {
  name?: string;
  conclusion?: string | null;
  html_url?: string | null;
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

type DigestItem = {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  note?: string;
};

type DigestCategory = {
  total: number;
  items: DigestItem[];
};

type DailyDigest = {
  mergedPullRequests: DigestCategory;
  newIssues: DigestCategory;
  closedIssues: DigestCategory;
  openPullRequests: number;
  openIssues: number;
};

type DigestStatus = { kind: 'ok'; digest: DailyDigest } | { kind: 'unknown' };

type IssueSearchItem = {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
};

type IssueSearchResponse = {
  total_count: number;
  items: IssueSearchItem[];
};
