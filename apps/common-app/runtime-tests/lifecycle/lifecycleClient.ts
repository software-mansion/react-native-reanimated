import { Platform } from 'react-native';

import { getScenarios } from './LifecycleApi';

type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

const CONSOLE_LEVELS: ConsoleLevel[] = ['log', 'info', 'warn', 'error'];

const SUPPRESSED_LOG_PATTERNS: RegExp[] = [
  /Deep imports from the 'react-native' package are deprecated/,
];

interface RunPhaseMessage {
  type: 'runPhase';
  scenario: string;
  step: number;
}

interface ErrorUtilsGlobal {
  ErrorUtils?: {
    setGlobalHandler: (
      handler: (error: Error, isFatal?: boolean) => void
    ) => void;
  };
}

function stringify(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

let sendToServer: (payload: unknown) => void = () => {};
let reportingInstalled = false;

function installReporting() {
  if (reportingInstalled) {
    return;
  }
  reportingInstalled = true;

  for (const level of CONSOLE_LEVELS) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      const isSuppressed = SUPPRESSED_LOG_PATTERNS.some(
        (pattern) => typeof args[0] === 'string' && pattern.test(args[0])
      );
      if (!isSuppressed) {
        sendToServer({ type: 'log', level, args: args.map(stringify) });
      }
      original(...args);
    };
  }

  // An uncaught error fails the scenario. The default handler would raise a
  // red box in a Debug build and end the app in a Release one.
  (globalThis as ErrorUtilsGlobal).ErrorUtils?.setGlobalHandler((error) => {
    sendToServer({
      type: 'uncaughtError',
      message: error?.message ?? String(error),
      stack: error?.stack,
    });
  });
}

/**
 * Announces the scenarios to `runtime-tests-server.js` and runs the phases it
 * asks for.
 *
 * @returns A function that closes the connection.
 */
export function connectToLifecycleServer(
  wsUrl: string,
  onStatus: (status: string) => void
): () => void {
  const ws = new WebSocket(wsUrl);

  sendToServer = (payload) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // The server notices a connection that is gone.
    }
  };
  installReporting();

  ws.onopen = () => {
    onStatus('Connected, waiting for a phase…');
    sendToServer({
      type: 'hello',
      platform: Platform.OS,
      platformVersion: String(Platform.Version),
      library: 'lifecycle',
      scenarios: getScenarios().map(({ name, steps, invalidateFirst }) => ({
        name,
        invalidateFirst,
        steps: steps.map((step) =>
          step.type === 'phase'
            ? { type: step.type, name: step.name }
            : { type: step.type }
        ),
      })),
    });
  };

  ws.onerror = () => {
    onStatus(`Could not connect to ${wsUrl}`);
  };

  ws.onmessage = (event) => {
    let message: RunPhaseMessage;
    try {
      message = JSON.parse(event.data as string) as RunPhaseMessage;
    } catch {
      return;
    }
    if (message.type !== 'runPhase') {
      return;
    }

    const step = getScenarios().find(({ name }) => name === message.scenario)
      ?.steps[message.step];
    const reportFinished = (ok: boolean, error?: unknown) => {
      sendToServer({
        type: 'phaseFinished',
        scenario: message.scenario,
        step: message.step,
        ok,
        message: ok ? undefined : stringify(error),
      });
      onStatus(ok ? 'Phase finished' : `Phase failed: ${String(error)}`);
    };

    if (step?.type !== 'phase') {
      reportFinished(
        false,
        `Step ${message.step} of '${message.scenario}' is not a phase.`
      );
      return;
    }

    onStatus(`${message.scenario}: ${step.name}`);
    Promise.resolve()
      .then(() => step.run())
      .then(
        () => reportFinished(true),
        (error: unknown) => reportFinished(false, error)
      );
  };

  return () => ws.close();
}
