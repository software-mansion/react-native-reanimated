import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CrosscheckOptions } from '../arguments.mts';
import { crosscheckCommand } from '../crosscheck-command.mts';
import type { CrosscheckDependencies } from '../crosscheck-command.mts';
import { ToolError } from '../errors.mts';
import type { IosTracer, TraceRecording } from '../xctrace.mts';
import { useTestRoot } from './command-fake.mts';
import {
  clockWithEndlessPolls,
  commandContext,
  fakeIosDevice,
  launchLine,
  readyLine,
} from './ios-device-fake.mts';
import type { FakeLaunch } from './ios-device-fake.mts';

const TEST_ROOT = useTestRoot('crosscheck-command', {});
const APP = 'com.reanimatedbenchmark.a';

function crosscheck(
  launch: FakeLaunch,
  record: (recording: TraceRecording) => Promise<void>
) {
  const { device, calls } = fakeIosDevice(() => launch);
  const tracer: IosTracer = {
    record,
    collect: async () => {
      throw new ToolError('no trace to collect');
    },
  };
  const dependencies: CrosscheckDependencies = {
    createDevice: () => device,
    createTracer: () => tracer,
    clock: clockWithEndlessPolls(),
  };
  const options: CrosscheckOptions = {
    command: 'crosscheck',
    device: { platform: 'ios', id: 'UDID1' },
    applicationId: APP,
    scenario: 'crosscheck-load',
    epochs: [{ load: 'idle', collector: 'full', seconds: 2.5 }],
    outputDir: TEST_ROOT.outputDir,
  };
  return {
    calls,
    result: crosscheckCommand(options, commandContext(), dependencies),
  };
}

describe('crosscheckCommand', () => {
  it('stops the wait for the SAMPLE line and the app when the recording fails', async () => {
    const { calls, result } = crosscheck(
      { lines: [launchLine(), readyLine('crosscheck-load')] },
      async ({ onRecording }) => {
        await onRecording();
        throw new ToolError('xctrace stopped (exit 1)');
      }
    );
    await assert.rejects(result, /xctrace stopped \(exit 1\)/);
    assert.deepEqual(calls.slice(-3), [
      'notify com.reanimatedbenchmark.start-epochs',
      'stop console',
      `terminate ${APP}`,
    ]);
  });

  it('is a tool error when the app ends before its SAMPLE line', async () => {
    const { calls, result } = crosscheck(
      {
        lines: [launchLine(), readyLine('crosscheck-load')],
        endsAfterLines: true,
      },
      async ({ onRecording }) => onRecording()
    );
    await assert.rejects(
      result,
      /The app gave no SAMPLE line: the app process 812 ended before its SAMPLE line/
    );
    assert.equal(calls.at(-1), `terminate ${APP}`);
  });
});
