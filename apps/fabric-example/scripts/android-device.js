/**
 * @typedef {{
 *   listDevices: () => Promise<string[]>;
 *   avdName: (serial: string) => Promise<string | null>;
 *   listAvds: () => Promise<string[]>;
 *   bootAvd: (avd: string) => void;
 *   isBootCompleted: (serial: string) => Promise<boolean>;
 *   sleep: (ms: number) => Promise<void>;
 *   log: (message: string) => void;
 *   bootTimeoutMs?: number;
 * }} AndroidTools
 */

/**
 * @param {{ serial: string | null; avd: string | null }} target
 * @param {AndroidTools} tools
 * @returns {Promise<string>}
 */
async function resolveAndroidDevice({ serial, avd }, tools) {
  const serials = await tools.listDevices();

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
      return waitForBoot(avd, tools);
    }
    const avds = await tools.listAvds();
    if (!avds.includes(avd)) {
      throw new Error(
        `AVD ${avd} is not running and does not exist (see \`emulator -list-avds\`)`
      );
    }
    return bootAndWait(avd, tools);
  }

  if (serials.length > 0) {
    if (serials.length > 1) {
      tools.log(
        `[runtime-tests] multiple Android devices connected, using ${serials[0]}`
      );
    }
    return serials[0];
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
  tools.bootAvd(avd);
  return waitForBoot(avd, tools);
}

/**
 * @param {string} avd
 * @param {AndroidTools} tools
 * @returns {Promise<string>}
 */
async function waitForBoot(avd, tools) {
  const timeoutMs = tools.bootTimeoutMs ?? 300_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const serial of await tools.listDevices()) {
      const name = await tools.avdName(serial).catch(() => null);
      if (name === avd && (await tools.isBootCompleted(serial))) {
        return serial;
      }
    }
    await tools.sleep(2000);
  }
  throw new Error(`Emulator ${avd} did not boot within ${timeoutMs / 1000}s`);
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

module.exports = { resolveAndroidDevice, findRunningAvd, parseAvdName };
