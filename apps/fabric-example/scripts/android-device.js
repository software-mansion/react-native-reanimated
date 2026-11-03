/** @typedef {{ serial: string; state: string }} AdbDevice */

/**
 * @typedef {{
 *   listDevices: () => Promise<AdbDevice[]>;
 *   avdName: (serial: string) => Promise<string | null>;
 *   listAvds: () => Promise<string[]>;
 *   bootAvd: (avd: string) => () => string | null;
 *   isBootCompleted: (serial: string) => Promise<boolean>;
 *   sleep: (ms: number) => Promise<void>;
 *   log: (message: string) => void;
 *   bootTimeoutMs?: number;
 *   exitGraceMs?: number;
 * }} AndroidTools
 */

/**
 * @param {{ serial: string | null; avd: string | null }} target
 * @param {AndroidTools} tools
 * @returns {Promise<string>}
 */
async function resolveAndroidDevice({ serial, avd }, tools) {
  const devices = await tools.listDevices();
  const serials = readySerials(devices);

  if (serial) {
    if (!serials.includes(serial)) {
      throw new Error(
        `No connected Android device with serial ${serial} (see \`adb devices\`)`
      );
    }
    return serial;
  }

  if (avd) {
    const running = await findRunningAvd(avd, serials, tools);
    if (running) {
      return waitForBoot(avd, () => null, tools);
    }
    const avds = await tools.listAvds();
    if (!avds.includes(avd)) {
      throw new Error(
        `AVD ${avd} is not running and does not exist (see \`emulator -list-avds\`)`
      );
    }
    return bootAndWait(avd, tools);
  }

  if (devices.length > 1) {
    const listed = devices
      .map((device) => `${device.serial} ${device.state}`)
      .join(', ');
    throw new Error(
      `${devices.length} Android devices are connected (${listed}), pass --serial or --avd to select one`
    );
  }
  if (devices.length === 1) {
    const [device] = devices;
    if (device.state !== 'device') {
      throw new Error(
        `Android device ${device.serial} is ${device.state}, pass --serial or --avd to select a ready one`
      );
    }
    return device.serial;
  }

  const [firstAvd] = await tools.listAvds();
  if (!firstAvd) {
    throw new Error(
      'No Android device connected and no AVDs available (see `emulator -list-avds`)'
    );
  }
  return bootAndWait(firstAvd, tools);
}

/**
 * @param {string} avd
 * @param {string[]} serials
 * @param {AndroidTools} tools
 * @returns {Promise<string | null>}
 */
async function findRunningAvd(avd, serials, tools) {
  for (const serial of serials) {
    const name = await tools.avdName(serial).catch(() => null);
    if (name === avd) {
      return serial;
    }
  }
  return null;
}

/**
 * @param {string} avd
 * @param {AndroidTools} tools
 * @returns {Promise<string>}
 */
async function bootAndWait(avd, tools) {
  tools.log(`[runtime-tests] booting emulator ${avd}`);
  const exitStatus = tools.bootAvd(avd);
  return waitForBoot(avd, exitStatus, tools);
}

/**
 * @param {string} avd
 * @param {() => string | null} exitStatus
 * @param {AndroidTools} tools
 * @returns {Promise<string>}
 */
async function waitForBoot(avd, exitStatus, tools) {
  const timeoutMs = tools.bootTimeoutMs ?? 300_000;
  const exitGraceMs = tools.exitGraceMs ?? 60_000;
  const deadline = Date.now() + timeoutMs;
  /** @type {number | null} */
  let exitedAt = null;
  while (Date.now() < deadline) {
    const status = exitStatus();
    const { booted, starting, unidentified } = await scanForAvd(avd, tools);
    if (booted) {
      return booted;
    }
    if (status !== null && !starting) {
      exitedAt ??= Date.now();
      if (!unidentified || Date.now() - exitedAt >= exitGraceMs) {
        throw new Error(`Emulator ${avd} exited (${status}) before it booted`);
      }
    }
    await tools.sleep(2000);
  }
  throw new Error(`Emulator ${avd} did not boot within ${timeoutMs / 1000}s`);
}

/**
 * @param {string} avd
 * @param {AndroidTools} tools
 * @returns {Promise<{
 *   booted: string | null;
 *   starting: boolean;
 *   unidentified: boolean;
 * }>}
 */
async function scanForAvd(avd, tools) {
  let starting = false;
  let unidentified = false;
  for (const device of await tools.listDevices()) {
    const ready = device.state === 'device';
    if (!ready && !device.serial.startsWith('emulator-')) {
      continue;
    }
    const name = await tools.avdName(device.serial).catch(() => null);
    if (name !== avd) {
      unidentified ||= !ready && name === null;
      continue;
    }
    if (ready && (await tools.isBootCompleted(device.serial))) {
      return { booted: device.serial, starting, unidentified };
    }
    starting = true;
  }
  return { booted: null, starting, unidentified };
}

/**
 * @param {AdbDevice[]} devices
 * @returns {string[]}
 */
function readySerials(devices) {
  return devices
    .filter((device) => device.state === 'device')
    .map((device) => device.serial);
}

/**
 * @param {string} output
 * @returns {string | null}
 */
function parseAvdName(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2 || lines[lines.length - 1] !== 'OK') {
    return null;
  }
  return lines[0];
}

module.exports = {
  resolveAndroidDevice,
  findRunningAvd,
  readySerials,
  parseAvdName,
};
