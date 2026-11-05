export const TUNNEL_RETRY_DELAYS_MS = [5_000, 10_000, 20_000];

export interface TunnelOperations {
  start: () => Promise<unknown>;
  stop: () => Promise<unknown>;
  sleep: (ms: number) => Promise<unknown>;
  log: (message: string) => void;
}

export async function startTunnelWithRetries(
  port: number,
  operations: TunnelOperations,
  delaysMs: readonly number[] = TUNNEL_RETRY_DELAYS_MS
) {
  const attempts = delaysMs.length + 1;

  await operations.stop().catch(() => {});
  for (let attempt = 1; ; attempt++) {
    try {
      await operations.start();
      return;
    } catch (error) {
      const message = errorMessage(error);

      if (attempt >= attempts || !isTransientTunnelError(message)) {
        throw error;
      }

      const delay = delaysMs[attempt - 1];
      operations.log(
        `tunnel setup for port ${port} failed with a transient error (attempt ${attempt}/${attempts}), retrying in ${delay / 1000} s: ${message}`
      );
      await operations.stop().catch(() => {});
      await operations.sleep(delay);
    }
  }
}

export function isTransientTunnelError(message: string) {
  return TRANSIENT_TUNNEL_ERROR_PATTERNS.some((pattern) =>
    pattern.test(message)
  );
}

const TRANSIENT_TUNNEL_ERROR_PATTERNS = [
  /\bHTTP 5\d\d\b/i,
  /\b(bad gateway|service unavailable|gateway timeout)\b/i,
  /\btime(d)? ?out\b/i,
  /\bconnection (reset|refused|closed|aborted)\b/i,
  /\b(ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEDOUT|EPIPE|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH)\b/,
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function describeCommandFailure(
  command: string,
  cmdArgs: string[],
  failure: { killed?: boolean; stderr: string; message: string }
) {
  const output = String(failure.stderr || failure.message).trim();
  const timedOut = failure.killed ? 'timed out; ' : '';
  return `${command} ${cmdArgs.join(' ')} failed: ${timedOut}${output}`;
}
