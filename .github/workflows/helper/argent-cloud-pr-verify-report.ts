import fs from 'node:fs';
import path from 'node:path';

import {
  clampText,
  detailsBlock,
  escapeSlack,
  extractVerdict,
  formatUsd,
  parseCost,
  publishReportIssue,
  readFile,
  readJsonObject,
  requireEnv,
  screenshotsSection,
  summaryOfOutput,
} from './argent-cloud-report.ts';
import type { Screenshots, Stream, Verdict } from './argent-cloud-report.ts';
import { postToSlack } from './slack.ts';

type Stage = 'plan-infeasible' | 'build-failed' | 'verify';

type Variant = 'base' | 'head';

type Outcome =
  | 'skipped'
  | 'build failed'
  | 'verified'
  | 'not fixed'
  | 'not reproduced without the change'
  | 'regression'
  | 'false issue'
  | 'blocked';

type Context = {
  stage: Stage;
  outcome: Outcome;
  pullRequestNumber: string;
  pullRequestTitle: string | undefined;
  pullRequestUrl: string;
  runUrl: string;
  baseCommit: string | undefined;
  headCommit: string | undefined;
  failedJobs: string | undefined;
  reportUrl: string | undefined;
  plan: Plan | null;
  runs: Record<Variant, Run>;
  summary: string;
  costs: Costs;
};

type Plan = {
  feasible?: boolean;
  reason?: string;
  summary?: string;
  analysis?: string;
  review?: string;
  reviewVerdict?: string;
  library?: string;
  reactNativeVersion?: string;
  architecture?: string;
  appKind?: string;
  reproductionSteps?: string[];
  verification?: {
    kind?: string;
    how?: string;
    passSignal?: string;
    failSignal?: string;
  };
  limitations?: string | null;
  expectedBehavior?: string;
  actualBehavior?: string;
};

type Run = {
  output: string | null;
  stream: string | null;
  brief: string | null;
  verdict: Verdict | null;
  cost: number;
  screenshots: Screenshots | null;
};

type Costs = { plan: number; verification: number; total: number };

const VARIANT_TITLES: Record<Variant, string> = {
  base: 'Without the change',
  head: 'With the change',
};

async function main(): Promise<void> {
  const command = process.argv[2];
  switch (command) {
    case 'report':
      writeReport(readContext());
      break;
    case 'publish':
      await publish(readContext());
      break;
    case 'notify':
      await notify(readContext());
      break;
    default:
      throw new Error(
        `usage: argent-cloud-pr-verify-report.ts <report|publish|notify>, got '${command ?? ''}'`
      );
  }
}

function readContext(): Context {
  const stage = requireEnv('STAGE') as Stage;
  const plan = readJsonObject<Plan>(process.env.PLAN_FILE);
  const runsDirectory = requireEnv('RUNS_DIR');
  const runs = {
    base: readRun(path.join(runsDirectory, 'base')),
    head: readRun(path.join(runsDirectory, 'head')),
  };
  const outcome = decideOutcome(stage, runs);
  const planCost = parseCost(process.env.PLAN_COST_USD);
  const verificationCost = runs.base.cost + runs.head.cost;
  return {
    stage,
    outcome,
    pullRequestNumber: requireEnv('PR_NUMBER'),
    pullRequestTitle: process.env.PR_TITLE || undefined,
    pullRequestUrl: requireEnv('PR_URL'),
    runUrl: requireEnv('RUN_URL'),
    baseCommit: process.env.BASE_SHA || undefined,
    headCommit: process.env.HEAD_SHA || undefined,
    failedJobs: process.env.FAILED_JOBS || undefined,
    reportUrl: process.env.REPORT_URL || undefined,
    plan,
    runs,
    summary: summaryText(stage, outcome, plan, runs),
    costs: {
      plan: planCost,
      verification: verificationCost,
      total: planCost + verificationCost,
    },
  };
}

function readRun(directory: string): Run {
  const output = readFile(path.join(directory, 'output', 'output.md'));
  const screenshotFiles = readFile(
    path.join(directory, 'output', 'screenshots.txt')
  );
  return {
    output,
    stream: readFile(path.join(directory, 'output', 'stream.md')),
    brief: readFile(path.join(directory, 'output', 'brief.md')),
    verdict: output ? extractVerdict(output) : null,
    cost: parseCost(readFile(path.join(directory, 'output', 'cost.txt'))),
    screenshots: screenshotFiles
      ? {
          files: screenshotFiles.split('\n'),
          artifactUrl:
            readFile(path.join(directory, 'output', 'screenshots-url.txt')) ??
            undefined,
        }
      : null,
  };
}

function decideOutcome(stage: Stage, runs: Record<Variant, Run>): Outcome {
  if (stage === 'plan-infeasible') {
    return 'skipped';
  }
  if (stage === 'build-failed') {
    return 'build failed';
  }
  const base = runs.base.verdict;
  const head = runs.head.verdict;
  if (!base || !head || base === 'BLOCKED' || head === 'BLOCKED') {
    return 'blocked';
  }
  if (base === 'FALSE ISSUE' || head === 'FALSE ISSUE') {
    return 'false issue';
  }
  if (base === 'REPRODUCIBLE') {
    return head === 'REPRODUCIBLE' ? 'not fixed' : 'verified';
  }
  return head === 'REPRODUCIBLE'
    ? 'regression'
    : 'not reproduced without the change';
}

function summaryText(
  stage: Stage,
  outcome: Outcome,
  plan: Plan | null,
  runs: Record<Variant, Run>
): string {
  if (stage === 'plan-infeasible') {
    return clampText(
      `Not attempted. ${plan?.reason ?? 'The agent produced no reason.'}`
    );
  }
  if (stage === 'build-failed') {
    return 'The app could not be built for one of the two commits. See the failed jobs in the run logs.';
  }
  return clampText(
    [
      `${OUTCOME_SENTENCES[outcome]}`,
      `${VARIANT_TITLES.base}: ${runSummary(runs.base)}`,
      `${VARIANT_TITLES.head}: ${runSummary(runs.head)}`,
    ].join(' ')
  );
}

const OUTCOME_SENTENCES: Record<Outcome, string> = {
  skipped: 'The verification was not attempted.',
  'build failed': 'The app could not be built.',
  verified:
    'The fail signal shows without the change and the pass signal shows with it.',
  'not fixed': 'The fail signal shows without the change and also with it.',
  'not reproduced without the change':
    'The pass signal shows without the change, so the run does not confirm the problem.',
  regression:
    'The pass signal shows without the change and the fail signal shows with it.',
  'false issue': 'A tester found that the plan is wrong about the behavior.',
  blocked: 'A tester could not complete the steps on one of the builds.',
};

function runSummary(run: Run): string {
  return run.output
    ? summaryOfOutput(run.output)
    : 'The tester produced no output.';
}

function writeReport(context: Context): void {
  const reportFile = requireEnv('REPORT_FILE');
  const lines: string[] = [];
  lines.push(
    `# Argent Cloud PR verification: ${pullRequestLabel(context)}`,
    ''
  );
  lines.push('| | |', '|---|---|');
  lines.push(`| Outcome | ${context.outcome} |`);
  if (context.stage === 'verify') {
    lines.push(
      `| ${VARIANT_TITLES.base} | ${verdictLabel(context.runs.base)} |`,
      `| ${VARIANT_TITLES.head} | ${verdictLabel(context.runs.head)} |`
    );
  }
  if (context.plan?.reviewVerdict) {
    lines.push(`| Code review | ${context.plan.reviewVerdict} |`);
  }
  lines.push(`| Pull request | ${context.pullRequestUrl} |`);
  lines.push(`| Workflow run | ${context.runUrl} |`);
  lines.push(`| Base commit | ${context.baseCommit ?? 'unknown'} |`);
  lines.push(`| Head commit | ${context.headCommit ?? 'unknown'} |`);
  if (context.failedJobs) {
    lines.push(`| Failed jobs | ${context.failedJobs} |`);
  }
  if (context.plan) {
    lines.push(`| Library | ${context.plan.library ?? 'unknown'} |`);
    lines.push(
      `| React Native | ${context.plan.reactNativeVersion ?? 'unknown'} |`
    );
    lines.push(`| Architecture | ${context.plan.architecture ?? 'unknown'} |`);
    lines.push(
      `| App | ${context.plan.appKind ?? 'unknown'} scaffold, iOS simulator, Release |`
    );
  }
  lines.push(`| Cost | ${costLine(context.costs)} |`, '');

  lines.push('## Summary', '', context.summary, '');

  if (context.plan?.review) {
    lines.push('## Code review', '', context.plan.review, '');
  }
  if (context.plan?.analysis) {
    lines.push('## Analysis of the problem', '', context.plan.analysis, '');
  }

  if (context.stage === 'verify') {
    lines.push(...runSection('base', context.runs.base));
    lines.push(...runSection('head', context.runs.head));
  }

  if (context.plan) {
    lines.push(...planSection(context.plan));
  }

  const brief = context.runs.base.brief ?? context.runs.head.brief;
  if (brief) {
    lines.push(
      '## Brief given to the testers',
      '',
      ...detailsBlock('Full brief', brief),
      ''
    );
  }
  if (context.plan) {
    lines.push(
      '## Plan JSON',
      '',
      ...detailsBlock(
        'plan.json',
        ['```json', JSON.stringify(context.plan, null, 2), '```'].join('\n')
      ),
      ''
    );
  }

  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, lines.join('\n'));
  console.log(`wrote ${reportFile}`);
}

function runSection(variant: Variant, run: Run): string[] {
  const lines = [
    `## ${VARIANT_TITLES[variant]} (${variant} commit)`,
    '',
    run.output ?? 'The tester produced no output. See the run logs.',
    '',
  ];
  if (run.screenshots) {
    lines.push(...screenshotsSection('### Screenshots', run.screenshots));
  }
  return lines;
}

function planSection(plan: Plan): string[] {
  const lines = ['## Verification plan', ''];
  if (plan.summary) {
    lines.push(plan.summary, '');
  }
  const steps = plan.reproductionSteps ?? [];
  if (steps.length > 0) {
    lines.push(
      '### Steps',
      '',
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      ''
    );
  }
  if (plan.verification) {
    lines.push('### Verification', '');
    lines.push(`- Kind: ${plan.verification.kind ?? 'unknown'}`);
    lines.push(`- How: ${plan.verification.how ?? ''}`);
    lines.push(`- With the change: ${plan.verification.passSignal ?? ''}`);
    lines.push(
      `- Without the change: ${plan.verification.failSignal ?? ''}`,
      ''
    );
  }
  if (plan.limitations) {
    lines.push('### Limitations', '', plan.limitations, '');
  }
  return lines;
}

async function publish(context: Context): Promise<void> {
  const streams: Stream[] = [];
  for (const variant of ['base', 'head'] as const) {
    const content = context.runs[variant].stream;
    if (content) {
      streams.push({
        name: `Agent stream: ${VARIANT_TITLES[variant].toLowerCase()}`,
        content,
      });
    }
  }
  await publishReportIssue({
    outcome: context.outcome,
    label: `PR ${pullRequestLabel(context)}`,
    streams,
  });
}

async function notify(context: Context): Promise<void> {
  const lines = [
    `${OUTCOME_EMOJIS[context.outcome]} Argent Cloud PR verification ${context.outcome}: ${escapeSlack(pullRequestLabel(context))}`,
  ];
  lines.push(`Summary: ${escapeSlack(context.summary)}`);
  if (context.plan?.reviewVerdict) {
    lines.push(`Code review: ${escapeSlack(context.plan.reviewVerdict)}`);
  }
  if (context.failedJobs) {
    lines.push(`Failed jobs: ${escapeSlack(context.failedJobs)}`);
  }
  lines.push(`Cost: ${costLine(context.costs)}`);
  if (context.reportUrl) {
    lines.push(`Report: ${context.reportUrl}`);
  }
  for (const variant of ['base', 'head'] as const) {
    const url = context.runs[variant].screenshots?.artifactUrl;
    if (url) {
      lines.push(
        `Screenshots ${VARIANT_TITLES[variant].toLowerCase()}: ${url}`
      );
    }
  }
  lines.push(
    `Pull request: ${context.pullRequestUrl}`,
    `Run: ${context.runUrl}`
  );
  await postToSlack({ text: lines.join('\n') });
}

const OUTCOME_EMOJIS: Record<Outcome, string> = {
  skipped: '⚪',
  'build failed': '🔴',
  verified: '🟢',
  'not fixed': '🔴',
  'not reproduced without the change': '🟠',
  regression: '🔴',
  'false issue': '⚪',
  blocked: '🔴',
};

function verdictLabel(run: Run): string {
  return run.verdict?.toLowerCase() ?? 'no verdict';
}

function pullRequestLabel(context: Context): string {
  return context.pullRequestTitle
    ? `#${context.pullRequestNumber} — ${context.pullRequestTitle}`
    : `#${context.pullRequestNumber}`;
}

function costLine(costs: Costs): string {
  const parts = [`plan ${formatUsd(costs.plan)}`];
  if (costs.verification > 0) {
    parts.push(`verification ${formatUsd(costs.verification)}`);
  }
  return `${formatUsd(costs.total)} (${parts.join(', ')})`;
}

main().catch((err: unknown) => {
  console.error('argent-cloud-pr-verify-report failed:', err);
  process.exitCode = 1;
});
