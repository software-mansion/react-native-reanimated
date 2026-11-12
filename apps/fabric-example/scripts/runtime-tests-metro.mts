export type MetroOutcome = 'running' | 'foreign' | 'idle';

export interface WaitForMetroOptions {
  /**
   * Resolves true when /status reports a running packager, false on timeout or
   * error.
   */
  probeMetro: (timeoutMs: number) => Promise<boolean>;
  probeTcp: () => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  timeoutMs: number;
  intervalMs: number;
  /** How long one /status request may take while the port is known to be held. */
  probeTimeoutMs: number;
}

/**
 * Decides what owns the Metro port.
 *
 * A process that holds the port is not necessarily a foreign one: a Metro
 * started seconds ago with `--reset-cache` accepts the connection long before
 * its `/status` answers, and a single probe cannot tell the two apart. So as
 * long as something holds the port, keep asking until it answers or the
 * deadline passes.
 *
 * The probes made while waiting get a longer budget than the first one. A Metro
 * that is still starting answers late every time rather than once, and a probe
 * that gives up before that can never see it come up.
 */
export async function waitForMetro({
  probeMetro,
  probeTcp,
  sleep,
  now,
  timeoutMs,
  intervalMs,
  probeTimeoutMs,
}: WaitForMetroOptions): Promise<MetroOutcome> {
  if (await probeMetro(probeTimeoutMs)) {
    return 'running';
  }
  if (!(await probeTcp())) {
    return 'idle';
  }

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    await sleep(intervalMs);
    if (await probeMetro(probeTimeoutMs)) {
      return 'running';
    }
    if (!(await probeTcp())) {
      return 'idle';
    }
  }
  return 'foreign';
}
