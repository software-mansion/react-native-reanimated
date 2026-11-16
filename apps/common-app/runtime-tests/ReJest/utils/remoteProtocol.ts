export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export interface DeclaredSuite {
  name: string;
  skipByDefault: boolean;
  disabled: boolean;
}

export interface TestFailure {
  suite: string;
  name: string;
  errors: string[];
}

export interface RunSummary {
  passed: number;
  failed: number;
  skipped: number;
  failedTests: string[];
  failures: TestFailure[];
  durationMs: number;
}

export interface HelloMessage {
  type: 'hello';
  platform: string;
  platformVersion: string;
  library: string;
  suites: DeclaredSuite[];
}

export interface LogMessage {
  type: 'log';
  level: ConsoleLevel;
  args: string[];
}

export interface SuiteFinishedMessage {
  type: 'suiteFinished';
  name: string;
}

export interface ReloadMessage extends RunSummary {
  type: 'reload';
  resumeFromSuite: string;
}

export interface DoneMessage extends RunSummary {
  type: 'done';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  stack?: string;
}

export type DeviceMessage =
  | HelloMessage
  | LogMessage
  | SuiteFinishedMessage
  | ReloadMessage
  | DoneMessage
  | ErrorMessage;

export interface StartMessage {
  type: 'start';
  only?: string[];
}

export interface ReloadAcceptedMessage {
  type: 'reloadAccepted';
}

export type ServerMessage = StartMessage | ReloadAcceptedMessage | ErrorMessage;
