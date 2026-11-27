import fs from 'node:fs';
import path from 'node:path';

export type KnownSanitizerIssue = {
  sanitizer: string;
  summary: string;
  reason: string;
  upstream?: string;
};

export type SanitizerReport = {
  file: string;
  index: number;
  sanitizer: string;
  summary: string;
  text: string;
};

export type ClassifiedReports = {
  known: { report: SanitizerReport; issue: KnownSanitizerIssue }[];
  unknown: SanitizerReport[];
};

const REPORT_HEADER =
  /^(?:SUMMARY|WARNING|(?:==\d+==)?ERROR): (\w+)Sanitizer: (.*)$/m;
const SUMMARY_LINE = /^SUMMARY: \w+Sanitizer: /;
const REPORT_START_LINE = /^(?:WARNING|(?:==\d+==)?ERROR): \w+Sanitizer: /;

if (process.argv[1] === import.meta.filename) {
  process.exitCode = main(process.argv.slice(2));
}

export function main(argv: string[]): number {
  const args = parseArgs(argv);
  const reportsDir = path.resolve(args.reports ?? 'sanitizer-reports');
  const knownFile = path.resolve(args.known ?? 'sanitizer-known-issues.json');
  const reports = readReports(reportsDir);
  if (reports.length === 0) {
    console.log('No sanitizer reports.');
    return 0;
  }
  const { known, unknown } = classifyReports(
    reports,
    readKnownIssues(knownFile)
  );
  for (const report of reports) {
    console.log(
      `::group::${path.basename(report.file)}#${report.index + 1}: ${report.summary}`
    );
    console.log(report.text);
    console.log('::endgroup::');
  }
  for (const { report, issue } of known) {
    console.log(
      `::warning title=Known ${report.sanitizer} sanitizer report::${report.summary}%0A${issue.reason}${issue.upstream ? `%0A${issue.upstream}` : ''}`
    );
  }
  for (const report of unknown) {
    console.log(
      `::error title=${report.sanitizer} sanitizer report::${report.summary}%0APrinted in the log above. A fixed upstream report can be listed in ${path.relative(process.cwd(), knownFile)}.`
    );
  }
  console.log(
    `${reports.length} sanitizer report(s): ${known.length} known, ${unknown.length} unknown.`
  );
  return unknown.length === 0 ? 0 : 1;
}

export function classifyReports(
  reports: SanitizerReport[],
  knownIssues: KnownSanitizerIssue[]
): ClassifiedReports {
  const classified: ClassifiedReports = { known: [], unknown: [] };
  for (const report of reports) {
    const issue = knownIssues.find(
      (candidate) =>
        candidate.sanitizer === report.sanitizer &&
        new RegExp(candidate.summary).test(report.summary)
    );
    if (issue) {
      classified.known.push({ report, issue });
    } else {
      classified.unknown.push(report);
    }
  }
  return classified;
}

export function parseSanitizerReports(
  file: string,
  text: string
): SanitizerReport[] {
  const segments: string[] = [];
  let current: string[] = [];
  for (const line of text.split('\n')) {
    if (/^=+\s*$/.test(line)) {
      continue;
    }
    if (REPORT_START_LINE.test(line)) {
      if (current.some((previous) => REPORT_START_LINE.test(previous))) {
        segments.push(current.join('\n').trim());
      } else if (segments.length > 0 && current.join('').trim().length > 0) {
        segments[segments.length - 1] += `\n${current.join('\n').trim()}`;
      }
      current = [];
    }
    current.push(line);
    if (SUMMARY_LINE.test(line)) {
      segments.push(current.join('\n').trim());
      current = [];
    }
  }
  const tail = current.join('\n').trim();
  if (REPORT_HEADER.test(tail) || segments.length === 0) {
    segments.push(tail);
  } else if (tail.length > 0) {
    segments[segments.length - 1] += `\n${tail}`;
  }
  const reports = segments.filter((segment) => REPORT_HEADER.test(segment));
  return (reports.length > 0 ? reports : [text.trim()]).map((chunk, index) =>
    parseSanitizerReport(file, index, chunk)
  );
}

function parseSanitizerReport(
  file: string,
  index: number,
  text: string
): SanitizerReport {
  const summary = text.match(/^SUMMARY: (\w+)Sanitizer: (.*)$/m);
  const header = text.match(REPORT_HEADER);
  return {
    file,
    index,
    sanitizer: sanitizerName(summary?.[1] ?? header?.[1] ?? ''),
    summary: (summary?.[2] ?? header?.[2] ?? 'unrecognized report').trim(),
    text,
  };
}

function readReports(reportsDir: string): SanitizerReport[] {
  let files: string[];
  try {
    files = fs.readdirSync(reportsDir);
  } catch {
    return [];
  }
  return files
    .sort()
    .map((name) => path.join(reportsDir, name))
    .filter((file) => fs.statSync(file).isFile())
    .flatMap((file) =>
      parseSanitizerReports(file, fs.readFileSync(file, 'utf8'))
    );
}

function readKnownIssues(knownFile: string): KnownSanitizerIssue[] {
  if (!fs.existsSync(knownFile)) {
    return [];
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(knownFile, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`${knownFile} must hold an array of known issues`);
  }
  return parsed.map((entry, index) => {
    const issue = entry as Partial<KnownSanitizerIssue>;
    if (
      typeof issue.sanitizer !== 'string' ||
      typeof issue.summary !== 'string' ||
      typeof issue.reason !== 'string'
    ) {
      throw new Error(
        `${knownFile}: entry ${index} needs the string fields sanitizer, summary and reason`
      );
    }
    return issue as KnownSanitizerIssue;
  });
}

function sanitizerName(prefix: string): string {
  switch (prefix) {
    case 'Thread':
      return 'thread';
    case 'Address':
      return 'address';
    case 'UndefinedBehavior':
      return 'undefined-behavior';
    default:
      return prefix.toLowerCase();
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`${token} requires a value`);
    }
    out[token.slice(2)] = next;
    i++;
  }
  return out;
}
