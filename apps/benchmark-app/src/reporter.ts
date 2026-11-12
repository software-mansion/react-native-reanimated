import NativeBenchmarkReporter from './specs/NativeBenchmarkReporter';

let uncaughtErrorScenario = 'none';
let hasReportedReady = false;
let hasFailed = false;

export function reportUncaughtErrors() {
  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    reportFailed(uncaughtErrorScenario, describeError(error));
    previousHandler(error, isFatal);
  });
}

export function setUncaughtErrorScenario(scenario: string) {
  uncaughtErrorScenario = scenario;
}

export function reportReady(scenario: string, version: number, load: number) {
  if (hasFailed || hasReportedReady) {
    return;
  }
  hasReportedReady = true;
  NativeBenchmarkReporter.report(
    `READY scenario=${scenario} version=${version} load=${load}`
  );
}

export function reportFailed(scenario: string, reason: string) {
  if (hasFailed) {
    return;
  }
  hasFailed = true;
  NativeBenchmarkReporter.report(
    `FAILED scenario=${scenario} reason=${toSingleLine(reason)}`
  );
}

export function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toSingleLine(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}
