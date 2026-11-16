import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { once } from '../command-context.mts';
import { ToolError } from '../errors.mts';
import { Processes } from '../processes.mts';

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

  it('stops a command and its children at its deadline, also when a child keeps the output open', async () => {
    const started = Date.now();
    let childPid = 0;
    await assert.rejects(
      new Processes().run(
        NODE,
        [
          '-e',
          `const child = require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 10000)'], { stdio: 'inherit' }); console.log(child.pid); setTimeout(() => {}, 10000)`,
        ],
        {
          timeoutMs: 500,
          onLine: (line) => {
            childPid = Number(line);
          },
        }
      ),
      /did not finish in 0.5 s/
    );
    assert.ok(Date.now() - started < 5000);
    assert.ok(childPid > 0);
    await waitFor(() => !isRunning(childPid));
  });

  it('rejects when it cannot write the log of a command', async () => {
    await assert.rejects(
      new Processes().run(NODE, ['-e', 'setTimeout(() => {}, 10000)'], {
        logFile: '/nonexistent-folder/build.log',
      }),
      /Cannot write the log \/nonexistent-folder\/build.log of node -e/
    );
  });

  it('rejects when a command ends before it reads all its input', async () => {
    await assert.rejects(
      new Processes().run(NODE, ['-e', 'process.exit(0)'], {
        input: 'x'.repeat(4_000_000),
      }),
      /node -e process.exit\(0\) ended before it read all its input/
    );
  });

  it('gives the output of a command that reads all its input', async () => {
    const { stdout } = await new Processes().run(
      NODE,
      ['-e', 'process.stdin.pipe(process.stdout)'],
      { input: 'query' }
    );
    assert.equal(stdout, 'query');
  });

  it('gives the output of a command that ends in time', async () => {
    const { stdout } = await new Processes().run(NODE, [
      '-e',
      'console.log("done")',
    ]);
    assert.equal(stdout, 'done\n');
  });

  it('gives each line of the output while the command runs', async () => {
    const lines: string[] = [];
    const { stdout } = await new Processes().run(
      NODE,
      [
        '-e',
        'process.stdout.write("one\\ntw"); setTimeout(() => console.log("o"), 50)',
      ],
      { onLine: (line) => lines.push(line) }
    );
    assert.deepEqual(lines, ['one', 'two']);
    assert.equal(stdout, 'one\ntwo\n');
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

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(condition: () => boolean) {
  for (let i = 0; i < 100 && !condition(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(condition());
}
