import type { Clock } from '../clock.mts';
import type { CommandContext } from '../command-context.mts';
import { ToolError } from '../errors.mts';
import type {
  IosDevice,
  IosDeviceState,
  IosLaunchArguments,
} from '../ios-device.mts';
import type { Processes } from '../processes.mts';
import { PROCESS_POLL_MS } from '../samples.mts';

export interface FakeLaunch {
  lines: string[];
  endsAfterLines?: boolean;
}

export const IOS_STATE: IosDeviceState = {
  deviceId: 'UDID1',
  name: 'Test iPhone',
  model: 'iPhone 14',
  productType: 'iPhone14,7',
  osVersion: '27.0.1',
  osBuild: '24A446',
};

export const APP_BUILD = 'sources1';

export function launchLine(): string {
  return `ReanimatedBenchmark: LAUNCH pid=812 mainThread=5001 refreshRate=60 thermal=0 coldStart=80.5 build=${APP_BUILD}`;
}

export function readyLine(scenario: string, version = 1, load = 80): string {
  return `ReanimatedBenchmark: READY scenario=${scenario} version=${version} load=${load} jsThread=5002`;
}

export function fakeIosDevice(
  launchAt: (launch: number, appArguments: IosLaunchArguments) => FakeLaunch
) {
  const calls: string[] = [];
  let launches = 0;
  const device = {
    readState: async () => IOS_STATE,
    checkInstalled: async () => {},
    terminate: async (applicationId: string) =>
      void calls.push(`terminate ${applicationId}`),
    postNotification: async (name: string) => void calls.push(`notify ${name}`),
    launch: (
      applicationId: string,
      appArguments: IosLaunchArguments,
      onLine: (line: string) => void
    ) => {
      launches++;
      calls.push(`launch ${applicationId}`);
      const { lines, endsAfterLines = false } = launchAt(
        launches,
        appArguments
      );
      onLine(`Launched application with ${applicationId} bundle identifier.`);
      lines.forEach(onLine);
      return {
        stop: () => void calls.push('stop console'),
        failure: () =>
          endsAfterLines ? new ToolError('the app process ended') : null,
      };
    },
  };
  return { device: device as unknown as IosDevice, calls };
}

export function clockWithEndlessPolls(): Clock {
  let time = 0;
  return {
    now: () => time,
    sleep: (ms) => {
      if (ms === PROCESS_POLL_MS) {
        return new Promise(() => {});
      }
      time += ms;
      return Promise.resolve();
    },
  };
}

export function commandContext(): CommandContext {
  return {
    processes: {
      run: async () => ({ stdout: '1.0\n', stderr: '' }),
    } as unknown as Processes,
    log: () => {},
    onInterrupt: () => {},
  };
}
