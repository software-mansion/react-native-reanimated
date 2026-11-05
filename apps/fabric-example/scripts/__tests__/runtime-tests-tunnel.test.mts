import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isTransientTunnelError,
  startTunnelWithRetries,
  TUNNEL_RETRY_DELAYS_MS,
} from '../runtime-tests-tunnel.mts';

const GATEWAY_TIMEOUT =
  'sim-remote reverse start UDID 8082 failed: error: port forwarder: POST /rules answered HTTP 504 Gateway Timeout';

describe('isTransientTunnelError', () => {
  it('retries 5xx answers and network timeouts', () => {
    for (const message of [
      GATEWAY_TIMEOUT,
      'error: port forwarder: POST /rules answered HTTP 502 Bad Gateway',
      'error: port forwarder: POST /rules answered HTTP 503 Service Unavailable',
      'error: request timed out',
      'error: connection reset by peer',
      'connect ECONNREFUSED 127.0.0.1:3000',
      'getaddrinfo EAI_AGAIN example.com',
    ]) {
      assert.equal(isTransientTunnelError(message), true, message);
    }
  });

  it('does not retry other errors', () => {
    for (const message of [
      'error: port forwarder: POST /rules answered HTTP 404 Not Found',
      'error: port forwarder: POST /rules answered HTTP 401 Unauthorized',
      "error: invalid value 'abc' for '<PORT>'",
      'error: unknown simulator UDID',
      'sim-remote reverse start UDID 8082 failed: spawn sim-remote ENOENT',
    ]) {
      assert.equal(isTransientTunnelError(message), false, message);
    }
  });
});

describe('startTunnelWithRetries', () => {
  it('waits 5 s, 10 s and 20 s between 4 attempts', () => {
    assert.deepEqual(TUNNEL_RETRY_DELAYS_MS, [5_000, 10_000, 20_000]);
  });

  it('stops the half-created tunnel and retries after a transient error', async () => {
    const calls = fakeOperations([GATEWAY_TIMEOUT, GATEWAY_TIMEOUT]);

    await startTunnelWithRetries(8082, calls.operations);

    assert.deepEqual(calls.events, [
      'start',
      'stop',
      'sleep 5000',
      'start',
      'stop',
      'sleep 10000',
      'start',
    ]);
    assert.deepEqual(
      calls.logs.map((message) => message.split(':')[0]),
      [
        'tunnel setup for port 8082 failed with a transient error (attempt 1/4), retrying in 5 s',
        'tunnel setup for port 8082 failed with a transient error (attempt 2/4), retrying in 10 s',
      ]
    );
  });

  it('gives up after 4 transient failures', async () => {
    const calls = fakeOperations(Array(4).fill(GATEWAY_TIMEOUT));

    await assert.rejects(
      startTunnelWithRetries(8082, calls.operations),
      /HTTP 504/
    );

    assert.equal(calls.events.filter((event) => event === 'start').length, 4);
    assert.deepEqual(
      calls.events.filter((event) => event.startsWith('sleep')),
      ['sleep 5000', 'sleep 10000', 'sleep 20000']
    );
  });

  it('fails fast on a non-transient error', async () => {
    const calls = fakeOperations(['error: unknown simulator UDID']);

    await assert.rejects(
      startTunnelWithRetries(8082, calls.operations),
      /unknown simulator/
    );

    assert.deepEqual(calls.events, ['start']);
  });

  it('accepts a tunnel that is already active', async () => {
    const calls = fakeOperations(['error: tunnel already active']);

    await startTunnelWithRetries(8082, calls.operations);

    assert.deepEqual(calls.events, ['start']);
    assert.deepEqual(calls.logs, ['tunnel already active on port 8082']);
  });

  it('ignores errors from stopping the half-created tunnel', async () => {
    const calls = fakeOperations([GATEWAY_TIMEOUT], {
      stopError: 'error: no active tunnel for UDID port 8082',
    });

    await startTunnelWithRetries(8082, calls.operations);

    assert.deepEqual(calls.events, ['start', 'stop', 'sleep 5000', 'start']);
  });
});

function fakeOperations(
  startErrors: string[],
  { stopError }: { stopError?: string } = {}
) {
  const events: string[] = [];
  const logs: string[] = [];
  const pendingErrors = [...startErrors];

  const operations = {
    start: async () => {
      events.push('start');
      const error = pendingErrors.shift();
      if (error !== undefined) {
        throw new Error(error);
      }
    },
    stop: async () => {
      events.push('stop');
      if (stopError !== undefined) {
        throw new Error(stopError);
      }
    },
    sleep: async (ms: number) => {
      events.push(`sleep ${ms}`);
    },
    log: (message: string) => {
      logs.push(message);
    },
  };

  return { events, logs, operations };
}
