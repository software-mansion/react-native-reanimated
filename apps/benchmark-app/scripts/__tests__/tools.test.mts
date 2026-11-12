import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ToolError } from '../errors.mts';
import { Processes, once } from '../tools.mts';

const NODE = process.execPath;

describe('Processes.run', () => {
  it('stops a command at its deadline and names the command', async () => {
    await assert.rejects(
      new Processes().run(NODE, ['-e', 'setTimeout(() => {}, 10000)'], {
        timeoutMs: 100,
      }),
      (error) =>
        error instanceof ToolError &&
        /^node -e setTimeout.* did not finish in 0.1 s$/.test(error.message)
    );
  });

  it('gives the output of a command that ends in time', async () => {
    const { stdout } = await new Processes().run(NODE, [
      '-e',
      'console.log("done")',
    ]);
    assert.equal(stdout, 'done\n');
  });
});

describe('Processes.streamLines', () => {
  it('gives a failure when the stream exits before it is stopped', async () => {
    const lines: string[] = [];
    const stream = new Processes().streamLines(
      NODE,
      ['-e', 'console.log("one")'],
      (line) => lines.push(line)
    );
    await waitFor(() => stream.failure() !== null);
    assert.deepEqual(lines, ['one']);
    assert.match(
      stream.failure()?.message ?? '',
      /before the driver stopped it/
    );
  });

  it('gives a failure when the stream cannot start', async () => {
    const stream = new Processes().streamLines(
      '/no/such/adb',
      ['logcat'],
      () => {}
    );
    await waitFor(() => stream.failure() !== null);
    assert.match(stream.failure()?.message ?? '', /Cannot start adb logcat/);
  });

  it('gives no failure when the driver stops the stream', async () => {
    const stream = new Processes().streamLines(
      NODE,
      ['-e', 'setTimeout(() => {}, 10000)'],
      () => {}
    );
    stream.stop();
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(stream.failure(), null);
  });
});

describe('once', () => {
  it('runs the action one time and gives the same promise to each caller', async () => {
    let runs = 0;
    const cleanUp = once(async (status: string) => {
      runs++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(status, 'interrupted');
    });
    await Promise.all([cleanUp('interrupted'), cleanUp('tool error')]);
    await cleanUp('done');
    assert.equal(runs, 1);
  });
});

async function waitFor(condition: () => boolean) {
  for (let i = 0; i < 100 && !condition(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(condition());
}
