export interface PlatformArgs {
  platform?: string;
  serial?: string;
  avd?: string;
  udid?: string;
}

export interface ResolvedPlatform {
  platform: 'ios' | 'android' | null;
  error?: string;
}

const PLATFORMS = ['ios', 'android'] as const;

// Each device flag names a platform on its own, so a driver run that selects a
// device but no platform still builds and installs for the right one.
const DEVICE_FLAG_PLATFORMS = {
  serial: 'android',
  avd: 'android',
  udid: 'ios',
} as const;

type DeviceFlag = keyof typeof DEVICE_FLAG_PLATFORMS;

export function resolvePlatform(args: PlatformArgs): ResolvedPlatform {
  const selected = (Object.keys(DEVICE_FLAG_PLATFORMS) as DeviceFlag[]).filter(
    (flag) => typeof args[flag] === 'string'
  );

  const serialAndAvd = selected.filter((flag) => flag !== 'udid');
  if (serialAndAvd.length > 1) {
    return {
      platform: null,
      error:
        '--serial and --avd name different Android targets; pass only one of them.',
    };
  }

  const implied = new Set(selected.map((flag) => DEVICE_FLAG_PLATFORMS[flag]));
  if (implied.size > 1) {
    return {
      platform: null,
      error: `${selected
        .map((flag) => `--${flag}`)
        .join(', ')} select different platforms; pass the flags of one platform only.`,
    };
  }

  const explicit =
    args.platform === undefined
      ? undefined
      : String(args.platform).toLowerCase();
  if (
    explicit !== undefined &&
    !(PLATFORMS as readonly string[]).includes(explicit)
  ) {
    return {
      platform: null,
      error: `--platform must be one of: ${PLATFORMS.join(', ')} (got: ${explicit})`,
    };
  }

  const inferred = [...implied][0];
  if (explicit !== undefined && inferred !== undefined && explicit !== inferred) {
    return {
      platform: null,
      error: `--platform ${explicit} contradicts ${selected
        .map((flag) => `--${flag}`)
        .join(', ')}; pass the flags of one platform only.`,
    };
  }

  const platform = explicit ?? inferred ?? 'ios';
  return { platform: platform as 'ios' | 'android' };
}
