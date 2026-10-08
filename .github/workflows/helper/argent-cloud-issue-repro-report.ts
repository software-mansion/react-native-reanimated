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
  readScreenshots,
  requireEnv,
  screenshotsSection,
  staticFeatureFlagsLabel,
  summaryOfOutput,
} from './argent-cloud-report.ts';
import type {
  Screenshots,
  StaticFeatureFlags,
  Verdict,
} from './argent-cloud-report.ts';
import { postToSlack } from './slack.ts';

type Stage = 'plan-infeasible' | 'build-failed' | 'reproduce';

type Context = {
  stage: Stage;
  status: string;
  issueNumber: string;
  issueTitle: string | undefined;
  issueUrl: string;
  runUrl: string;
  failedStep: string | undefined;
  reportUrl: string | undefined;
  plan: Plan | null;
  brief: string | null;
  output: string | null;
  stream: string | null;
  verdict: Verdict | null;
  summary: string;
  costs: Costs;
  screenshots: Screenshots | null;
};

type Plan = {
  feasible?: boolean;
  reason?: string;
  summary?: string;
  analysis?: string;
  limitations?: string | null;
  library?: string;
  reactNativeVersion?: string;
  reanimatedVersion?: string;
  workletsVersion?: string | null;
  architecture?: string;
  staticFeatureFlags?: StaticFeatureFlags;
  appKind?: string;
  reproductionSteps?: string[];
  verification?: {
    kind?: string;
    how?: string;
    passSignal?: string;
    failSignal?: string;
  };
  expectedBehavior?: string;
  actualBehavior?: string;
};

type Costs = { plan: number; reproduction: number; total: number };

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
        `usage: argent-cloud-issue-repro-report.ts <report|publish|notify>, got '${command ?? ''}'`
      );
  }
}

function readContext(): Context {
  const stage = (process.env.STAGE ?? 'reproduce') as Stage;
  const plan = readJsonObject<Plan>(process.env.PLAN_FILE);
  const output = readFile(process.env.OUTPUT_FILE);
  const planCost = parseCost(process.env.PLAN_COST_USD);
  const reproductionCost = parseCost(process.env.REPRO_COST_USD);
  const verdict = output ? extractVerdict(output) : null;
  return {
    stage,
    status: process.env.STATUS ?? 'unknown',
    issueNumber: requireEnv('ISSUE_NUMBER'),
    issueTitle: process.env.ISSUE_TITLE || undefined,
    issueUrl: requireEnv('ISSUE_URL'),
    runUrl: requireEnv('RUN_URL'),
    failedStep: process.env.FAILED_STEP || undefined,
    reportUrl: process.env.REPORT_URL || undefined,
    plan,
    brief: readFile(process.env.BRIEF_FILE),
    output,
    stream: readFile(process.env.STREAM_FILE),
    verdict,
    summary: summaryText(stage, plan, output),
    costs: {
      plan: planCost,
      reproduction: reproductionCost,
      total: planCost + reproductionCost,
    },
    screenshots: readScreenshots(
      process.env.SCREENSHOTS_DIR,
      process.env.SCREENSHOTS_URL
    ),
  };
}

function summaryText(
  stage: Stage,
  plan: Plan | null,
  output: string | null
): string {
  if (stage === 'plan-infeasible') {
    return clampText(
      `Not attempted. ${plan?.reason ?? 'The agent produced no reason.'}`
    );
  }
  if (stage === 'build-failed') {
    return 'The reproduction app could not be built. See the run logs.';
  }
  if (!output) {
    return 'The reproduction agent produced no output. See the run logs.';
  }
  return clampText(summaryOfOutput(output));
}

function writeReport(context: Context): void {
  const reportFile = requireEnv('REPORT_FILE');
  const lines: string[] = [];
  lines.push(`# Argent Cloud reproduction: ${issueLabel(context)}`, '');
  lines.push('| | |', '|---|---|');
  lines.push(`| Outcome | ${outcomeLabel(context)} |`);
  lines.push(`| Issue | ${context.issueUrl} |`);
  lines.push(`| Workflow run | ${context.runUrl} |`);
  if (context.failedStep) {
    lines.push(`| Failed step | ${context.failedStep} |`);
  }
  if (context.plan) {
    lines.push(`| Library | ${context.plan.library ?? 'unknown'} |`);
    lines.push(
      `| React Native | ${context.plan.reactNativeVersion ?? 'unknown'} |`
    );
    lines.push(
      `| Reanimated | ${context.plan.reanimatedVersion ?? 'unknown'} |`
    );
    lines.push(`| Worklets | ${context.plan.workletsVersion ?? 'none'} |`);
    lines.push(`| Architecture | ${context.plan.architecture ?? 'unknown'} |`);
    lines.push(
      `| Static feature flags | ${staticFeatureFlagsLabel(context.plan.staticFeatureFlags)} |`
    );
    lines.push(
      `| App | ${context.plan.appKind ?? 'unknown'} scaffold, iOS simulator, Release |`
    );
  }
  lines.push(`| Cost | ${costLine(context.costs)} |`, '');

  lines.push('## Summary', '', context.summary, '');

  if (context.output) {
    lines.push('## Reproduction result', '', context.output, '');
  }

  if (context.screenshots) {
    lines.push(...screenshotsSection('## Screenshots', context.screenshots));
  }

  if (context.plan) {
    lines.push('## Reproduction plan', '');
    if (context.plan.summary) {
      lines.push(context.plan.summary, '');
    }
    const steps = context.plan.reproductionSteps ?? [];
    if (steps.length > 0) {
      lines.push(
        '### Steps',
        '',
        ...steps.map((step, index) => `${index + 1}. ${step}`),
        ''
      );
    }
    const verification = context.plan.verification;
    if (verification) {
      lines.push('### Verification', '');
      lines.push(`- Kind: ${verification.kind ?? 'unknown'}`);
      lines.push(`- How: ${verification.how ?? ''}`);
      lines.push(`- Pass: ${verification.passSignal ?? ''}`);
      lines.push(`- Fail: ${verification.failSignal ?? ''}`, '');
    }
    if (context.plan.expectedBehavior) {
      lines.push('### Expected', '', context.plan.expectedBehavior, '');
    }
    if (context.plan.actualBehavior) {
      lines.push('### Actual', '', context.plan.actualBehavior, '');
    }
    if (context.plan.limitations) {
      lines.push('### Limitations', '', context.plan.limitations, '');
    }
    if (context.plan.analysis) {
      lines.push('### Analysis', '', context.plan.analysis, '');
    }
  }

  if (context.brief) {
    lines.push(
      '## Brief given to the tester',
      '',
      ...detailsBlock('Full brief', context.brief),
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

async function publish(context: Context): Promise<void> {
  await publishReportIssue({
    outcome: outcomeLabel(context),
    label: issueLabel(context),
    streams: context.stream
      ? [{ name: 'Agent stream', content: context.stream }]
      : [],
  });
}

async function notify(context: Context): Promise<void> {
  const lines = [
    `${outcomeEmoji(context)} Argent Cloud repro ${outcomeLabel(context)}: ${escapeSlack(issueLabel(context))}`,
  ];
  lines.push(`Summary: ${escapeSlack(context.summary)}`);
  if (context.failedStep) {
    lines.push(`Failed step: ${escapeSlack(context.failedStep)}`);
  }
  lines.push(`Cost: ${costLine(context.costs)}`);
  if (context.reportUrl) {
    lines.push(`Report: ${context.reportUrl}`);
  }
  if (context.screenshots?.artifactUrl) {
    lines.push(`Screenshots: ${context.screenshots.artifactUrl}`);
  }
  lines.push(`Issue: ${context.issueUrl}`, `Run: ${context.runUrl}`);
  await postToSlack({ text: lines.join('\n') });
}

function outcomeLabel(context: Context): string {
  switch (context.stage) {
    case 'plan-infeasible':
      return 'skipped';
    case 'build-failed':
      return 'build failed';
    default:
      return context.verdict?.toLowerCase() ?? context.status;
  }
}

function outcomeEmoji(context: Context): string {
  if (context.stage === 'plan-infeasible') {
    return '⚪';
  }
  if (context.stage === 'build-failed') {
    return '🔴';
  }
  switch (context.verdict) {
    case 'REPRODUCIBLE':
      return '🟢';
    case 'NOT REPRODUCIBLE':
      return '🟠';
    case 'FALSE ISSUE':
      return '⚪';
    case 'BLOCKED':
      return '🔴';
    default:
      return context.status === 'success' ? '🟢' : '🔴';
  }
}

function issueLabel(context: Context): string {
  return context.issueTitle
    ? `#${context.issueNumber} — ${context.issueTitle}`
    : `#${context.issueNumber}`;
}

function costLine(costs: Costs): string {
  const parts = [`plan ${formatUsd(costs.plan)}`];
  if (costs.reproduction > 0) {
    parts.push(`reproduction ${formatUsd(costs.reproduction)}`);
  }
  return `${formatUsd(costs.total)} (${parts.join(', ')})`;
}

main().catch((err: unknown) => {
  console.error('argent-cloud-issue-repro-report failed:', err);
  process.exitCode = 1;
});
