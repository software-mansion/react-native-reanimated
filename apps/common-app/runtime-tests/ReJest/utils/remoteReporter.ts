import { Platform } from 'react-native';

type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

const CONSOLE_LEVELS: ConsoleLevel[] = ['log', 'info', 'warn', 'error'];

const SUPPRESSED_LOG_PATTERNS: RegExp[] = [
  /Deep imports from the 'react-native' package are deprecated/,
];

function shouldSuppress(args: unknown[]): boolean {
  const first = args[0];
  if (typeof first !== 'string') {
    return false;
  }
  return SUPPRESSED_LOG_PATTERNS.some((pattern) => pattern.test(first));
}

interface DeclaredSuite {
  name: string;
  skipByDefault: boolean;
  disabled: boolean;
}

interface RunSummary {
  passed: number;
  failed: number;
  skipped: number;
  failedTests: string[];
  durationMs: number;
}

export interface RemoteReporterOptions {
  wsUrl: string;
  library: string;
  declaredSuites: DeclaredSuite[];
  onStatus: (message: string) => void;
  onStart: (params: {
    only?: string[];
  }) => Promise<RunSummary | void>;
}

interface StartMessage {
  type: 'start';
  only?: string[];
}

interface ErrorUtilsGlobal {
  ErrorUtils?: {
    getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
    setGlobalHandler: (
      handler: (error: Error, isFatal?: boolean) => void
    ) => void;
  };
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  try {
    return JSON.stringify(
      value,
      (_key, val: unknown) => (typeof val === 'bigint' ? val.toString() : val),
      0
    );
  } catch {
    return String(value);
  }
}

function formatArgs(args: unknown[]): string[] {
  return args.map(safeStringify);
}

export function runWithRemoteReporter({
  wsUrl,
  library,
  declaredSuites,
  onStatus,
  onStart,
}: RemoteReporterOptions): () => void {
  let socket: WebSocket | null = null;
  let teardown = () => {};

  try {
    socket = new WebSocket(wsUrl);
  } catch (error) {
    onStatus(`Failed to open WebSocket: ${(error as Error).message}`);
    return () => {};
  }

  const ws = socket;
  const originalConsole: Partial<Record<ConsoleLevel, typeof console.log>> =
    {};
  let consolePatched = false;
  let runStarted = false;
  let runFinishedEnvelopeSent = false;
  let previousGlobalErrorHandler:
    | ((error: Error, isFatal?: boolean) => void)
    | null = null;
  const errorUtils = (globalThis as ErrorUtilsGlobal).ErrorUtils;

  const nativeLog = console.log.bind(console);
  const nativeWarn = console.warn.bind(console);

  const safeSend = (payload: unknown) => {
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(payload));
      } catch (error) {
        nativeWarn(
          '[remoteReporter] ws.send failed:',
          (error as Error).message
        );
      }
    }
  };

  const patchConsole = () => {
    if (consolePatched) {
      return;
    }
    consolePatched = true;
    for (const level of CONSOLE_LEVELS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const original = (console as any)[level] as typeof console.log;
      originalConsole[level] = original;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (console as any)[level] = (...args: unknown[]) => {
        if (!shouldSuppress(args)) {
          safeSend({ type: 'log', level, args: formatArgs(args) });
        }
        try {
          original(...args);
        } catch {
          /* keep run going even if forwarding to native console throws */
        }
      };
    }
  };

  const restoreConsole = () => {
    if (!consolePatched) {
      return;
    }
    consolePatched = false;
    for (const level of CONSOLE_LEVELS) {
      const original = originalConsole[level];
      if (original) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (console as any)[level] = original;
      }
    }
  };

  const installGlobalErrorHandler = () => {
    if (!errorUtils) {
      return;
    }
    previousGlobalErrorHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      const message = `[uncaught${isFatal ? ' fatal' : ''}] ${error?.message ?? String(error)}`;
      nativeWarn(`[remoteReporter] ${message}`, error?.stack ?? '');
      safeSend({
        type: 'log',
        level: 'error',
        args: formatArgs([message, error?.stack ?? '']),
      });
      // Do NOT call the previous global handler — RN's default would re-raise
      // a red box / propagate the fatal further. We've already surfaced it.
    });
  };

  const restoreGlobalErrorHandler = () => {
    if (errorUtils && previousGlobalErrorHandler) {
      errorUtils.setGlobalHandler(previousGlobalErrorHandler);
      previousGlobalErrorHandler = null;
    }
  };

  const sendFinalEnvelope = (envelope: Record<string, unknown>) => {
    if (runFinishedEnvelopeSent) {
      return;
    }
    runFinishedEnvelopeSent = true;
    safeSend(envelope);
    setTimeout(() => {
      if (
        ws.readyState === 1 ||
        ws.readyState === 0
      ) {
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }
    }, 2000);
  };

  ws.onopen = () => {
    onStatus('Connected, waiting for start…');
    safeSend({
      type: 'hello',
      platform: Platform.OS,
      platformVersion: String(Platform.Version),
      library,
      suites: declaredSuites,
    });
  };

  ws.onerror = (event) => {
    const message =
      (event as Event & { message?: string }).message ?? 'unknown';
    nativeWarn(`[remoteReporter] WebSocket error: ${message}`);
    onStatus(`WebSocket error: ${message}`);
  };

  ws.onclose = (event) => {
    const code = (event as CloseEvent & { code?: number }).code ?? 'unknown';
    const reason = (event as CloseEvent & { reason?: string }).reason ?? '';
    if (runStarted && !runFinishedEnvelopeSent) {
      nativeWarn(
        `[remoteReporter] WebSocket closed mid-run (code=${code}, reason=${reason || 'n/a'})`
      );
    } else if (!runStarted) {
      nativeLog(
        `[remoteReporter] disconnected before run started (code=${code})`
      );
      onStatus(`Disconnected from ${wsUrl} before run started`);
    }
    restoreConsole();
    restoreGlobalErrorHandler();
  };

  ws.onmessage = (event) => {
    let parsed: StartMessage;
    try {
      parsed = JSON.parse(event.data as string) as StartMessage;
    } catch {
      return;
    }

    if (parsed.type !== 'start' || runStarted) {
      return;
    }

    runStarted = true;
    onStatus('Running tests…');
    patchConsole();
    installGlobalErrorHandler();

    onStart({ only: parsed.only })
      .then((summary) => {
        const finalSummary = summary ?? {
          passed: 0,
          failed: 0,
          skipped: 0,
          failedTests: [] as string[],
          durationMs: 0,
        };
        sendFinalEnvelope({ type: 'done', ...finalSummary });
        onStatus(
          `Done — ${finalSummary.passed} passed, ${finalSummary.failed} failed`
        );
      })
      .catch((error: Error) => {
        nativeWarn(
          '[remoteReporter] run rejected:',
          error?.stack ?? error?.message
        );
        sendFinalEnvelope({
          type: 'error',
          message: error.message,
          stack: error.stack,
        });
        onStatus(`Run errored: ${error.message}`);
      })
      .finally(() => {
        restoreConsole();
        restoreGlobalErrorHandler();
      });
  };

  teardown = () => {
    restoreConsole();
    restoreGlobalErrorHandler();
    try {
      ws.close();
    } catch {
      /* noop */
    }
  };

  return teardown;
}
