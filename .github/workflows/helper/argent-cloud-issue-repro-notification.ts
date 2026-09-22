import fs from 'node:fs';

import { postToSlack } from './slack.ts';

const CHUNK_LIMIT = 3800;
const MAX_CHUNKS_PER_FILE = 10;

async function main(): Promise<void> {
  const number = process.env.ISSUE_NUMBER;
  const title = process.env.ISSUE_TITLE;
  const issueUrl = process.env.ISSUE_URL;
  const runUrl = process.env.RUN_URL;
  const status = process.env.STATUS;
  const stage = process.env.STAGE ?? 'reproduce';
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
    await postToSlack({
      text: [
        `🔴 Argent Cloud repro build failed: ${issue}`,
        ...links,
        '',
        '_See the run logs._',
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
  if (output) {
    await postInChunks(resultHeading, links, output);
  } else {
    await postToSlack({
      text: [
        resultHeading,
        ...links,
        '',
        '_The reproduction agent produced no output. See the run logs._',
      ].join('\n'),
    });
  }
}

async function postInChunks(
  heading: string,
  links: string[],
  content: string
): Promise<void> {
  const chunks = splitIntoChunks(content, CHUNK_LIMIT);
  const truncated = chunks.length > MAX_CHUNKS_PER_FILE;
  const sent = chunks.slice(0, MAX_CHUNKS_PER_FILE);

  for (const [index, chunk] of sent.entries()) {
    const part = sent.length > 1 ? ` (part ${index + 1}/${sent.length})` : '';
    const lines = [`${heading}${part}`];
    if (index === 0) {
      lines.push(...links);
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
