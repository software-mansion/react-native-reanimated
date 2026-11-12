import fs from 'node:fs';
import path from 'node:path';

import {
  AndroidDevice,
  DeviceStateGuard,
  checkSdk,
  cleanUpDevice,
} from './android-device.mts';
import type { SampleOptions } from './arguments.mts';
import { SAMPLES_DIR } from './paths.mts';
import { TraceProcessor } from './perfetto.mts';
import { SYSTEM_CLOCK, takeSample } from './protocol.mts';
import { runFolderName } from './results.mts';
import {
  once,
  readToolVersions,
  resolveAdb,
  resolveTraceProcessor,
} from './tools.mts';
import type { CommandContext } from './tools.mts';

export async function sampleCommand(
  options: SampleOptions,
  context: CommandContext
): Promise<number> {
  const { processes, log } = context;
  const adb = resolveAdb();
  const traceProcessorBinary = resolveTraceProcessor(options.traceProcessor);
  const device = new AndroidDevice(processes, adb, options.serial);
  await device.checkConnected();
  await device.checkInstalled(options.applicationId);
  const state = await device.readState();
  checkSdk(state);
  const tools = await readToolVersions(
    processes,
    adb,
    traceProcessorBinary,
    options.serial
  );

  const cleanUp = once(() =>
    cleanUpDevice(device, [options.applicationId], log)
  );
  context.onInterrupt(cleanUp);

  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  const traceFile = path.join(
    SAMPLES_DIR,
    `${runFolderName(new Date(), options.scenario)}-${Date.now()}.perfetto-trace`
  );
  log(
    `sample ${options.applicationId} ${options.scenario}${options.load === undefined ? '' : ` load=${options.load}`}`
  );
  const sample = await takeSample(
    {
      applicationId: options.applicationId,
      stopApplicationIds: [options.applicationId],
      scenario: options.scenario,
      load: options.load,
      baselineTemperature: state.batteryTemperature,
      guard: new DeviceStateGuard(state),
      traceFile,
      keepTrace: options.keepTrace,
    },
    device,
    new TraceProcessor(processes, traceProcessorBinary),
    SYSTEM_CLOCK
  ).catch(async (error: unknown) => {
    await cleanUp();
    throw error;
  });
  console.log(
    JSON.stringify(
      {
        serial: options.serial,
        applicationId: options.applicationId,
        scenario: options.scenario,
        load: options.load ?? null,
        device: state,
        tools,
        sample,
      },
      null,
      2
    )
  );
  return sample.valid ? 0 : 1;
}
