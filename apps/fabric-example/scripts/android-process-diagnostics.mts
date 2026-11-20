export const APP_LOGCAT_LINE_LIMIT = 400;
export const PROCESS_DEATH_LINE_LIMIT = 100;

const PROCESS_DEATH_LINE =
  /lowmemorykiller|lmkd|ActivityManager.*(Kill|died)|am_kill|am_proc_died/;
const THREADTIME_PID = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+(\d+)\s+\d+\s/;

export function filterAppLogcat(
  logcat: string,
  packageName: string,
  alivePids: string[],
  limits = {
    app: APP_LOGCAT_LINE_LIMIT,
    processDeath: PROCESS_DEATH_LINE_LIMIT,
  }
): string[] {
  const lines = logcat.split('\n').filter((line) => line.trim());
  const pids = new Set([...alivePids, ...appPidsInLogcat(lines, packageName)]);
  const isAppLine = (line: string) => {
    const pid = THREADTIME_PID.exec(line)?.[1];
    return (pid !== undefined && pids.has(pid)) || line.includes(packageName);
  };
  const appLines = lastIndices(lines, isAppLine, limits.app);
  const processDeathLines = lastIndices(
    lines,
    (line) => !isAppLine(line) && PROCESS_DEATH_LINE.test(line),
    limits.processDeath
  );
  return [...appLines, ...processDeathLines]
    .sort((a, b) => a - b)
    .map((index) => lines[index]);
}

export function parsePidof(output: string): string[] {
  return output
    .trim()
    .split(/\s+/)
    .filter((pid) => /^\d+$/.test(pid));
}

function appPidsInLogcat(lines: string[], packageName: string): string[] {
  const name = escapeRegExp(packageName);
  const patterns = [
    new RegExp(`Start proc (\\d+):${name}[/:\\s]`),
    new RegExp(`am_proc_start\\s*: \\[\\d+,(\\d+),\\d+,${name}[,\\]]`),
    new RegExp(`am_proc_bound\\s*: \\[\\d+,(\\d+),${name}[,\\]]`),
  ];
  return lines.flatMap((line) =>
    patterns.flatMap((pattern) => {
      const pid = pattern.exec(line)?.[1];
      return pid ? [pid] : [];
    })
  );
}

function lastIndices(
  lines: string[],
  predicate: (line: string) => boolean,
  limit: number
): number[] {
  return lines
    .flatMap((line, index) => (predicate(line) ? [index] : []))
    .slice(-limit);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
