export interface ScenarioReport {
  version: number;
  load: number;
  jsThread: number | null;
}

export interface LaunchReport {
  pid: number;
  mainThread: number;
  refreshRate: number;
  thermalState: number;
  coldStart: number;
  appBuild: string;
}

export type ReportLine =
  | ({ kind: 'ready'; scenario: string } & ScenarioReport)
  | { kind: 'failed'; scenario: string; reason: string };

export function parseReportLine(line: string): ReportLine | null {
  const text = line.trim();
  const ready =
    /^READY scenario=(\S+) version=(\d+) load=(\d+)(?: jsThread=(\d+))?$/.exec(
      text
    );
  if (ready) {
    return {
      kind: 'ready',
      scenario: ready[1],
      version: Number(ready[2]),
      load: Number(ready[3]),
      jsThread: ready[4] === undefined ? null : Number(ready[4]),
    };
  }
  const failed = /^FAILED scenario=(\S+) reason=(.*)$/.exec(text);
  if (failed) {
    return { kind: 'failed', scenario: failed[1], reason: failed[2] };
  }
  return null;
}

export function parseLaunchLine(line: string): LaunchReport | null {
  const launch =
    /^LAUNCH pid=(\d+) mainThread=(\d+) refreshRate=(\d+) thermal=(\d+) coldStart=(\d+(?:\.\d+)?) build=(\S*)$/.exec(
      line.trim()
    );
  return launch
    ? {
        pid: Number(launch[1]),
        mainThread: Number(launch[2]),
        refreshRate: Number(launch[3]),
        thermalState: Number(launch[4]),
        coldStart: Number(launch[5]),
        appBuild: launch[6],
      }
    : null;
}

export function failureText(report: Extract<ReportLine, { kind: 'failed' }>) {
  return `FAILED scenario=${report.scenario} reason=${report.reason}`;
}

export function scenarioReportOf(
  report: Extract<ReportLine, { kind: 'ready' }>
): ScenarioReport {
  return {
    version: report.version,
    load: report.load,
    jsThread: report.jsThread,
  };
}
