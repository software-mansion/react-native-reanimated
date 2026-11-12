import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { waitForMetro } from '../runtime-tests-metro.mts';

describe('waitForMetro', () => {
  it('returns as soon as /status answers', async () => {
    let probes = 0;
    const outcome = await waitForMetro({
      probeMetro: async () => {
        probes += 1;
        return true;
      },
      probeTcp: async () => true,
      sleep: async () => {},
      now: () => 0,
      timeoutMs: 180_000,
      intervalMs: 500,
      probeTimeoutMs: 5_000,
    });

    assert.equal(outcome, 'running');
    assert.equal(probes, 1);
  });

  it('keeps waiting while another process holds the port but has not answered yet', async () => {
    // A Metro started seconds ago with --reset-cache accepts the connection
    // long before /status answers. One failed probe is not proof that the port
    // belongs to something else.
    let elapsed = 0;
    let probes = 0;
    const outcome = await waitForMetro({
      probeMetro: async () => {
        probes += 1;
        return probes >= 3;
      },
      probeTcp: async () => true,
      sleep: async (ms) => {
        elapsed += ms;
      },
      now: () => elapsed,
      timeoutMs: 180_000,
      intervalMs: 500,
      probeTimeoutMs: 5_000,
    });

    assert.equal(outcome, 'running');
    assert.equal(probes, 3);
  });

  it('reports the port as taken by something else when nothing ever answers', async () => {
    let elapsed = 0;
    const outcome = await waitForMetro({
      probeMetro: async () => false,
      probeTcp: async () => true,
      sleep: async (ms) => {
        elapsed += ms;
      },
      now: () => elapsed,
      timeoutMs: 1_000,
      intervalMs: 500,
      probeTimeoutMs: 5_000,
    });

    assert.equal(outcome, 'foreign');
  });

  it('reports an idle port without waiting', async () => {
    let probes = 0;
    const outcome = await waitForMetro({
      probeMetro: async () => {
        probes += 1;
        return false;
      },
      probeTcp: async () => false,
      sleep: async () => {},
      now: () => 0,
      timeoutMs: 180_000,
      intervalMs: 500,
      probeTimeoutMs: 5_000,
    });

    assert.equal(outcome, 'idle');
    assert.equal(probes, 1);
  });

  it('reports an idle port when the holder exits during the wait', async () => {
    // The process that held the port can exit while we wait for it to answer.
    // Treating that as a foreign holder would abort instead of starting Metro
    // on the port it just freed.
    let elapsed = 0;
    let probes = 0;
    const outcome = await waitForMetro({
      probeMetro: async () => {
        probes += 1;
        return false;
      },
      probeTcp: async () => probes < 2,
      sleep: async (ms) => {
        elapsed += ms;
      },
      now: () => elapsed,
      timeoutMs: 30_000,
      intervalMs: 500,
      probeTimeoutMs: 5_000,
    });

    assert.equal(outcome, 'idle');
  });

  it('stops at the deadline instead of polling forever', async () => {
    let elapsed = 0;
    let probes = 0;
    const outcome = await waitForMetro({
      probeMetro: async () => {
        probes += 1;
        return false;
      },
      probeTcp: async () => true,
      sleep: async (ms) => {
        elapsed += ms;
      },
      now: () => elapsed,
      timeoutMs: 3_000,
      intervalMs: 1_000,
      probeTimeoutMs: 5_000,
    });

    assert.equal(outcome, 'foreign');
    assert.ok(probes <= 5, `probed ${probes} times`);
  });
});
