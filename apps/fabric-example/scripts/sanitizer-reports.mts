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
  sanitizer: string;
  summary: string;
  text: string;
};

export type ClassifiedReports = {
  known: { report: SanitizerReport; issue: KnownSanitizerIssue }[];
  unknown: SanitizerReport[];
};

if (process.argv[1] === import.meta.filename) {
  process.exit(main(process.argv.slice(2)));
}

export function main(argv: string[]): number {
  const args = parseArgs(argv);
  const reportsDir = path.resolve(args.reports ?? 'sanitizer-reports');
  const knownFile = path.resolve(args.known ?? 'sanitizer-known-issues.json');
  const sanitizer = args.sanitizer ?? '';
  const reports = readReports(reportsDir);
  if (reports.length === 0) {
    console.log('No sanitizer reports.');
    return 0;
  }
  const knownIssues = readKnownIssues(knownFile).filter(
    (issue) => !sanitizer || issue.sanitizer === sanitizer
  );
  const { known, unknown } = classifyReports(reports, knownIssues);
  for (const report of reports) {
    console.log(`::group::${path.basename(report.file)}: ${report.summary}`);
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
    `${reports.length} sanitizer report file(s): ${known.length} known, ${unknown.length} unknown.`
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

export function parseSanitizerReport(
  file: string,
  text: string
): SanitizerReport {
  const warning = text.match(/^WARNING: (\w+)Sanitizer: (.*)$/m);
  const summary = text.match(/^SUMMARY: \w+Sanitizer: (.*)$/m);
  return {
    file,
    sanitizer: sanitizerName(warning?.[1] ?? ''),
    summary: (summary?.[1] ?? warning?.[2] ?? 'unrecognized report').trim(),
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
    .map((file) => parseSanitizerReport(file, fs.readFileSync(file, 'utf8')));
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
