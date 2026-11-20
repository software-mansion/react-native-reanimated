import type { SampleOptions } from './arguments.mts';
import { once } from './command-context.mts';
import type { CommandContext } from './command-context.mts';
import { PLATFORM_DEFINITIONS } from './definitions.mts';
import { SAMPLES_DIR } from './paths.mts';
import { platformOf } from './platforms.mts';
import { measurementFolderName } from './results.mts';

export async function sampleCommand(
  options: SampleOptions,
  context: CommandContext
): Promise<number> {
  const { processes, log } = context;
  const platform = platformOf(options.device.platform);
  const session = await platform.connect(processes, options.device.id, {
    traceProcessor: options.traceProcessor,
  });
  await session.checkInstalled(options.applicationId);
  const tools = await session.readToolVersions();

  const cleanUp = once(() => session.cleanUp([options.applicationId], log));
  context.onInterrupt(cleanUp);

  log(
    `sample ${options.applicationId} ${options.scenario}${options.load === undefined ? '' : ` load=${options.load}`}`
  );
  const sample = await session
    .sampling({
      start: session.startState,
      appRefreshRate: null,
      inAppState: null,
      comparesBatteryLevel: true,
    })
    .takeSample({
      applicationId: options.applicationId,
      stopApplicationIds: [options.applicationId],
      scenario: options.scenario,
      load: options.load,
      outputDir: SAMPLES_DIR,
      sampleName: `${measurementFolderName(new Date(), options.scenario)}-${Date.now()}`,
      keepTrace: options.keepTrace,
    })
    .catch(async (error: unknown) => {
      await cleanUp();
      throw error;
    });
  console.log(
    JSON.stringify(
      {
        measurementRevision:
          PLATFORM_DEFINITIONS[options.device.platform].measurementRevision,
        applicationId: options.applicationId,
        scenario: options.scenario,
        load: options.load ?? null,
        device: session.startState,
        tools,
        sample,
      },
      null,
      2
    )
  );
  return sample.valid ? 0 : 1;
}
