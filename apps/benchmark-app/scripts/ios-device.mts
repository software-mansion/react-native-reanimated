import { ToolError } from './errors.mts';
import type { LineStream, Processes } from './tools.mts';

export interface IosDeviceState {
  hardwareSerial: string;
  name: string;
  model: string;
  productType: string;
  osVersion: string;
  osBuild: string;
}

export interface IosToolVersions {
  node: string;
  xcode: string;
  xctrace: string;
  devicectl: string;
}

export interface InstalledApp {
  bundleIdentifier: string;
  url: string;
}

export interface RunningProcess {
  processIdentifier: number;
  executable: string;
}

export const IOS_COMPARED_STATE_KEYS = [
  'hardwareSerial',
  'productType',
  'osBuild',
] as const satisfies readonly (keyof IosDeviceState)[];

export const LAUNCHED_LINE = /^Launched application with \S+ bundle identifier/;
export const DEVICE_COMMAND_TIMEOUT_MS = 60_000;
export const INSTALL_TIMEOUT_MS = 5 * 60_000;

const XCODE_VERSION_LINES = 2;

export class IosDevice {
  readonly udid: string;
  readonly #processes: Processes;

  constructor(processes: Processes, udid: string) {
    this.#processes = processes;
    this.udid = udid;
  }

  async readState(): Promise<IosDeviceState> {
    const details = await this.#query(['info', 'details']).catch(
      (error: Error) => {
        throw new ToolError(
          `No ready device with UDID ${this.udid} (see \`xcrun devicectl list devices\`): ${error.message}`
        );
      }
    );
    return parseDeviceDetails(details);
  }

  async checkInstalled(bundleIdentifier: string) {
    if ((await this.#findApp(bundleIdentifier)) === null) {
      throw new ToolError(
        `${bundleIdentifier} is not installed on ${this.udid}`
      );
    }
  }

  async install(ipa: string, timeoutMs = INSTALL_TIMEOUT_MS) {
    await this.#device(['install', 'app', ipa], timeoutMs);
  }

  async terminate(bundleIdentifier: string) {
    const app = await this.#findApp(bundleIdentifier);
    if (app === null) {
      return;
    }
    const running = parseRunningProcesses(
      await this.#query(['info', 'processes'])
    );
    for (const process of processesOf(app, running)) {
      await this.#device([
        'process',
        'terminate',
        '--pid',
        String(process.processIdentifier),
        '--kill',
      ]);
    }
  }

  launch(
    bundleIdentifier: string,
    scenario: string | undefined,
    load: number | undefined,
    onLine: (line: string) => void
  ): LineStream {
    return this.#processes.streamLines(
      'xcrun',
      [
        'devicectl',
        'device',
        'process',
        'launch',
        '--device',
        this.udid,
        '--console',
        '--terminate-existing',
        bundleIdentifier,
        ...launchArguments(scenario, load),
      ],
      onLine
    );
  }

  async #findApp(bundleIdentifier: string): Promise<InstalledApp | null> {
    const apps = parseInstalledApps(
      await this.#query(['info', 'apps', '--bundle-id', bundleIdentifier])
    );
    return (
      apps.find((app) => app.bundleIdentifier === bundleIdentifier) ?? null
    );
  }

  async #query(command: string[]): Promise<string> {
    return this.#device([...command, '--quiet', '--json-output', '-']);
  }

  async #device(
    command: string[],
    timeoutMs = DEVICE_COMMAND_TIMEOUT_MS
  ): Promise<string> {
    const [group, ...rest] = command;
    return (
      await this.#processes.run(
        'xcrun',
        ['devicectl', 'device', group, ...rest, '--device', this.udid],
        { timeoutMs }
      )
    ).stdout;
  }
}

export async function readIosToolVersions(
  processes: Processes
): Promise<IosToolVersions> {
  const output = async (args: string[]) =>
    (await processes.run('xcrun', args)).stdout.trim();
  return {
    node: process.version,
    xcode: (await output(['xcodebuild', '-version']))
      .split('\n')
      .slice(0, XCODE_VERSION_LINES)
      .join(', '),
    xctrace: await output(['xctrace', 'version']),
    devicectl: await output(['devicectl', '--version']),
  };
}

export function launchArguments(
  scenario: string | undefined,
  load: number | undefined
): string[] {
  const values = [
    ...(scenario === undefined ? [] : ['-benchmarkScenario', scenario]),
    ...(load === undefined ? [] : ['-benchmarkLoad', String(load)]),
  ];
  return values.length > 0 ? ['--', ...values] : [];
}

export function parseDeviceDetails(output: string): IosDeviceState {
  const properties = resultOf(output).properties as
    | {
        hardware?: {
          udid?: string;
          marketingName?: string;
          productType?: string;
        };
        software?: {
          osVersionNumber?: { stringValue?: string };
          osBuildVersions?: { buildVersion?: { name?: string } };
        };
        state?: { name?: string };
      }
    | undefined;
  const state = {
    hardwareSerial: properties?.hardware?.udid,
    name: properties?.state?.name,
    model: properties?.hardware?.marketingName,
    productType: properties?.hardware?.productType,
    osVersion: properties?.software?.osVersionNumber?.stringValue,
    osBuild: properties?.software?.osBuildVersions?.buildVersion?.name,
  };
  const missing = Object.entries(state)
    .filter(([, value]) => typeof value !== 'string' || value === '')
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new ToolError(
      `The device details of devicectl do not give: ${missing.join(', ')}`
    );
  }
  return state as IosDeviceState;
}

export function parseInstalledApps(output: string): InstalledApp[] {
  return listOf(resultOf(output).apps, 'apps').map((app) => ({
    bundleIdentifier: stringOf(app.bundleIdentifier, 'apps.bundleIdentifier'),
    url: stringOf(app.url, 'apps.url'),
  }));
}

export function parseRunningProcesses(output: string): RunningProcess[] {
  return listOf(resultOf(output).runningProcesses, 'runningProcesses').map(
    (process) => ({
      processIdentifier: Number(process.processIdentifier),
      executable: stringOf(process.executable, 'runningProcesses.executable'),
    })
  );
}

export function processesOf(
  app: InstalledApp,
  running: RunningProcess[]
): RunningProcess[] {
  const bundle = app.url.endsWith('/') ? app.url : `${app.url}/`;
  return running.filter((process) => process.executable.startsWith(bundle));
}

export function changedIosStateKeys(
  reference: IosDeviceState,
  current: IosDeviceState
): string[] {
  return IOS_COMPARED_STATE_KEYS.filter(
    (key) => reference[key] !== current[key]
  ).map((key) => `${key}: ${reference[key]} -> ${current[key]}`);
}

function resultOf(output: string): Record<string, unknown> {
  let parsed: { result?: Record<string, unknown> };
  try {
    parsed = JSON.parse(output) as typeof parsed;
  } catch (error) {
    throw new ToolError(
      `Cannot read the JSON output of devicectl: ${(error as Error).message}`
    );
  }
  if (typeof parsed.result !== 'object' || parsed.result === null) {
    throw new ToolError('The JSON output of devicectl has no result');
  }
  return parsed.result;
}

function listOf(value: unknown, name: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new ToolError(`The JSON output of devicectl has no list "${name}"`);
  }
  return value as Record<string, unknown>[];
}

function stringOf(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new ToolError(`The JSON output of devicectl has no text "${name}"`);
  }
  return value;
}
