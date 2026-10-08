import fs from 'node:fs';
import path from 'node:path';

const GITHUB_BODY_LIMIT = 60_000;
const GITHUB_TITLE_LIMIT = 256;
const SUMMARY_LIMIT = 600;

export type Verdict =
  | 'REPRODUCIBLE'
  | 'NOT REPRODUCIBLE'
  | 'FALSE ISSUE'
  | 'BLOCKED';

export type Screenshots = { files: string[]; artifactUrl: string | undefined };

export type Stream = { name: string; content: string };

export async function publishReportIssue({
  outcome,
  label,
  streams,
}: {
  outcome: string;
  label: string;
  streams: Stream[];
}): Promise<void> {
  const repo = requireEnv('REPORTS_REPO');
  const token = requireEnv('REPORTS_TOKEN');
  const runId = requireEnv('RUN_ID');
  const report = readFile(requireEnv('REPORT_FILE'));
  if (!report) {
    throw new Error('the report file is missing or empty');
  }
  const apiUrl = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const prefix = `${outcome}: `;
  const suffix = ` (run ${runId})`;
  const room = GITHUB_TITLE_LIMIT - prefix.length - suffix.length;
  const title = `${prefix}${label.length > room ? `${label.slice(0, room - 1)}…` : label}${suffix}`;
  const issue = await githubPost(`${apiUrl}/repos/${repo}/issues`, headers, {
    title,
    body: clampBody(
      report,
      'The report was truncated. The full file is in the workflow artifacts.'
    ),
  });
  console.log(`opened ${issue.html_url}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `url=${issue.html_url}\n`);
  }

  for (const stream of streams) {
    const chunks = splitIntoChunks(stream.content, GITHUB_BODY_LIMIT - 200);
    for (const [index, chunk] of chunks.entries()) {
      const part =
        chunks.length > 1 ? ` (part ${index + 1}/${chunks.length})` : '';
      await githubPost(
        `${apiUrl}/repos/${repo}/issues/${issue.number}/comments`,
        headers,
        { body: detailsBlock(`${stream.name}${part}`, chunk).join('\n') }
      );
    }
    console.log(`posted '${stream.name}' in ${chunks.length} comment(s)`);
  }
}

async function githubPost(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<{ number: number; html_url: string }> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status} for ${url}: ${(await response.text()).slice(0, 400)}`
    );
  }
  return (await response.json()) as { number: number; html_url: string };
}

function clampBody(text: string, note: string): string {
  if (text.length <= GITHUB_BODY_LIMIT) {
    return text;
  }
  return `${text.slice(0, GITHUB_BODY_LIMIT - note.length - 4)}\n\n_${note}_`;
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

export function detailsBlock(summary: string, content: string): string[] {
  return [
    '<details>',
    `<summary>${summary}</summary>`,
    '',
    content,
    '',
    '</details>',
  ];
}

export function extractVerdict(output: string): Verdict | null {
  const firstLine = output.split('\n')[0]?.trim() ?? '';
  const match =
    /^#\s+(REPRODUCIBLE|NOT REPRODUCIBLE|FALSE ISSUE|BLOCKED)\s*$/.exec(
      firstLine
    );
  return match ? (match[1] as Verdict) : null;
}

export function summaryOfOutput(output: string): string {
  return extractSummary(output) ?? fallbackSummary(output);
}

function extractSummary(output: string): string | null {
  const match = /^##\s+Summary\s*\n([\s\S]*?)(?=^#{1,6}\s|(?![\s\S]))/m.exec(
    output
  );
  const text = match?.[1]?.trim().replace(/\s*\n\s*/g, ' ');
  return text || null;
}

function fallbackSummary(output: string): string {
  const body = output.replace(/^#[^\n]*\n/, '').trim();
  const paragraph =
    body
      .split(/\n\s*\n/)[0]
      ?.replace(/\s*\n\s*/g, ' ')
      .trim() ?? '';
  return paragraph || 'The report has no summary section. See the full report.';
}

export function clampText(text: string): string {
  return text.length > SUMMARY_LIMIT
    ? `${text.slice(0, SUMMARY_LIMIT - 1)}…`
    : text;
}

export function screenshotsSection(
  heading: string,
  screenshots: Screenshots
): string[] {
  return [
    heading,
    '',
    screenshots.artifactUrl
      ? `The tester took ${screenshots.files.length} screenshot(s). Download them from ${screenshots.artifactUrl}.`
      : `The tester took ${screenshots.files.length} screenshot(s). They are in the workflow artifacts.`,
    '',
    ...screenshots.files.map((file) => `- \`${file}\``),
    '',
  ];
}

export function readScreenshots(
  directory: string | undefined,
  artifactUrl: string | undefined
): Screenshots | null {
  if (!directory || !fs.existsSync(directory)) {
    return null;
  }
  const files = fs
    .readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => fs.statSync(path.join(directory, file)).isFile())
    .sort();
  return files.length > 0
    ? { files, artifactUrl: artifactUrl || undefined }
    : null;
}

export function escapeSlack(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatUsd(value: number): string {
  if (value > 0 && value < 0.005) {
    return '<$0.01';
  }
  return `$${value.toFixed(2)}`;
}

export function parseCost(value: string | undefined | null): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function readJsonObject<T>(file: string | undefined): T | null {
  const content = readFile(file);
  if (!content) {
    return null;
  }
  const parsed: unknown = JSON.parse(content);
  return typeof parsed === 'object' && parsed !== null ? (parsed as T) : null;
}

export function readFile(file: string | undefined): string | null {
  if (!file || !fs.existsSync(file)) {
    return null;
  }
  const content = fs.readFileSync(file, 'utf8').trim();
  return content || null;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
