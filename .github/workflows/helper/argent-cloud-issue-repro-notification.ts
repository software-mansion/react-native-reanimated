import fs from 'node:fs';

import { postToSlack } from './slack.ts';

const CHUNK_LIMIT = 3800;
const MAX_CHUNKS_PER_FILE = 10;
const SUMMARY_MODEL = 'claude-opus-5';
const SUMMARY_SYSTEM_PROMPT =
  'You summarize the report of an automated attempt to reproduce a GitHub issue on an iOS simulator. ' +
  'Answer in at most three short sentences of plain text, no markdown. ' +
  'State first whether the bug reproduced, did not reproduce, or the attempt failed. ' +
  'Then give the decisive evidence, or the reason the attempt failed. ' +
  'Do not repeat the issue title and do not mention token usage or cost.';

async function main(): Promise<void> {
  const number = process.env.ISSUE_NUMBER;
  const title = process.env.ISSUE_TITLE;
  const issueUrl = process.env.ISSUE_URL;
  const runUrl = process.env.RUN_URL;
  const status = process.env.STATUS;
  const stage = process.env.STAGE ?? 'reproduce';
  const failedStep = process.env.FAILED_STEP;
  const planFile = process.env.PLAN_FILE;
  const streamFile = process.env.STREAM_FILE;
  const outputFile = process.env.OUTPUT_FILE;

  if (!number || !issueUrl || !runUrl || !status) {
    throw new Error(
      'ISSUE_NUMBER, ISSUE_URL, RUN_URL and STATUS are required to post an Argent Cloud repro notification.'
    );
  }

  const issue = title ? `#${number} — ${title}` : `#${number}`;
  const links = [`Issue: ${issueUrl}`, `Run: ${runUrl}`];

  if (stage === 'plan-infeasible') {
    const reason = readReason(planFile);
    await postToSlack({
      text: [
        `⚪ Argent Cloud repro skipped: ${issue}`,
        ...links,
        '',
        `Reason: ${reason}`,
      ].join('\n'),
    });
    return;
  }

  if (stage === 'build-failed') {
    const where = failedStep
      ? `Failed step: ${failedStep}`
      : 'See the run logs.';
    await postToSlack({
      text: [
        `🔴 Argent Cloud repro build failed: ${issue}`,
        ...links,
        '',
        where,
      ].join('\n'),
    });
    return;
  }

  const stream = readFile(streamFile);
  if (stream) {
    await postInChunks(`🧵 Argent Cloud repro stream: ${issue}`, links, stream);
  }

  const output = readFile(outputFile);
  const resultHeading = `${statusEmoji(status)} Argent Cloud repro ${status}: ${issue}`;
  const details = [...links];
  if (status !== 'success' && failedStep) {
    details.push(`Failed step: ${failedStep}`);
  }
  if (output) {
    const summary = await summarize(output);
    if (summary) {
      details.push('', `Summary: ${summary}`);
    }
    await postInChunks(resultHeading, details, output);
  } else {
    await postToSlack({
      text: [
        resultHeading,
        ...details,
        '',
        '_The reproduction agent produced no output. See the run logs._',
      ].join('\n'),
    });
  }
}

async function summarize(report: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY is not set; posting without a summary');
    return null;
  }
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        ['max_tokens']: 1024,
        fallbacks: 'default',
        ['output_config']: { effort: 'low' },
        system: SUMMARY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: report }],
      }),
    });
    if (!response.ok) {
      console.warn(
        `summary request failed with ${response.status}: ${(await response.text()).slice(0, 400)}`
      );
      return null;
    }
    const message = (await response.json()) as {
      stop_reason?: string;
      content?: { type: string; text?: string }[];
    };
    if (message.stop_reason === 'refusal') {
      console.warn('summary request was refused');
      return null;
    }
    const text = (message.content ?? [])
      .filter(
        (block) => block.type === 'text' && typeof block.text === 'string'
      )
      .map((block) => block.text)
      .join('')
      .trim();
    return text || null;
  } catch (error) {
    console.warn('summary request errored:', error);
    return null;
  }
}

async function postInChunks(
  heading: string,
  details: string[],
  content: string
): Promise<void> {
  const chunks = splitIntoChunks(content, CHUNK_LIMIT);
  const truncated = chunks.length > MAX_CHUNKS_PER_FILE;
  const sent = chunks.slice(0, MAX_CHUNKS_PER_FILE);

  for (const [index, chunk] of sent.entries()) {
    const part = sent.length > 1 ? ` (part ${index + 1}/${sent.length})` : '';
    const lines = [`${heading}${part}`];
    if (index === 0) {
      lines.push(...details);
    }
    lines.push('', '```', chunk, '```');
    if (truncated && index === sent.length - 1) {
      lines.push('', '_Truncated. The full file is in the run artifacts._');
    }
    await postToSlack({ text: lines.join('\n') });
  }
}

function splitIntoChunks(content: string, limit: number): string[] {
  const chunks: string[] = [];
  let rest = content;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit / 2) {
      cut = limit;
    }
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, '');
  }
  chunks.push(rest);
  return chunks;
}

function statusEmoji(status: string): string {
  return status === 'success' ? '🟢' : '🔴';
}

function readReason(file: string | undefined): string {
  const content = readFile(file);
  if (!content) {
    return 'no plan was produced';
  }
  const plan: unknown = JSON.parse(content);
  if (
    typeof plan === 'object' &&
    plan !== null &&
    'reason' in plan &&
    typeof plan.reason === 'string'
  ) {
    return plan.reason;
  }
  return 'the plan has no reason';
}

function readFile(file: string | undefined): string | null {
  if (!file || !fs.existsSync(file)) {
    return null;
  }
  const content = fs.readFileSync(file, 'utf8').trim();
  return content || null;
}

main().catch((err: unknown) => {
  console.error('Error posting Argent Cloud repro notification to Slack:', err);
  process.exitCode = 1;
});
