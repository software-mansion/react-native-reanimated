import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePlatform } from '../runtime-tests-platform.mts';

describe('resolvePlatform', () => {
  it('defaults to ios when nothing selects a platform', () => {
    assert.deepEqual(resolvePlatform({}), { platform: 'ios' });
  });

  it('keeps an explicit --platform', () => {
    assert.deepEqual(resolvePlatform({ platform: 'android' }), {
      platform: 'android',
    });
  });

  it('treats --serial as an Android target', () => {
    // --serial names an Android device, so passing one and getting the iOS
    // path would silently run against a simulator instead of that device.
    assert.deepEqual(resolvePlatform({ serial: 'emulator-5554' }), {
      platform: 'android',
    });
  });

  it('treats --avd as an Android target', () => {
    assert.deepEqual(resolvePlatform({ avd: 'Pixel_9' }), {
      platform: 'android',
    });
  });

  it('treats --udid as an iOS target', () => {
    assert.deepEqual(resolvePlatform({ udid: '1234-ABCD' }), {
      platform: 'ios',
    });
  });

  it('lowercases an explicit --platform', () => {
    assert.deepEqual(resolvePlatform({ platform: 'ANDROID' }), {
      platform: 'android',
    });
  });

  it('rejects a device flag that contradicts --platform', () => {
    // Answering either way would build for one platform and target the other.
    const result = resolvePlatform({
      platform: 'ios',
      serial: 'emulator-5554',
    });
    assert.equal(result.platform, null);
    assert.match(result.error ?? '', /--serial/);
    assert.match(result.error ?? '', /--platform/);
  });

  it('rejects --serial together with --avd', () => {
    const result = resolvePlatform({ serial: 'emulator-5554', avd: 'Pixel_9' });
    assert.equal(result.platform, null);
    assert.match(result.error ?? '', /--serial/);
    assert.match(result.error ?? '', /--avd/);
  });

  it('names the flags that disagree when they select different platforms', () => {
    const result = resolvePlatform({ avd: 'Pixel_9', udid: '1234-ABCD' });
    assert.equal(result.platform, null);
    assert.match(result.error ?? '', /--avd/);
    assert.match(result.error ?? '', /--udid/);
    assert.doesNotMatch(result.error ?? '', /--serial/);
  });

  it('rejects an empty --serial instead of selecting Android for it', () => {
    // `--serial "$ANDROID_SERIAL"` expands to an empty string when the variable
    // is unset. Selecting Android for it would drop the name and let the run
    // pick whatever device happens to be connected.
    const result = resolvePlatform({ serial: '' });
    assert.equal(result.platform, null);
    assert.match(result.error ?? '', /--serial/);
  });

  it('rejects an empty --avd', () => {
    const result = resolvePlatform({ avd: '' });
    assert.equal(result.platform, null);
    assert.match(result.error ?? '', /--avd/);
  });

  it('rejects an empty --udid', () => {
    const result = resolvePlatform({ udid: '' });
    assert.equal(result.platform, null);
    assert.match(result.error ?? '', /--udid/);
  });

  it('rejects an empty --platform', () => {
    const result = resolvePlatform({ platform: '' });
    assert.equal(result.platform, null);
    assert.match(result.error ?? '', /--platform/);
  });

  it('rejects an unknown --platform', () => {
    const result = resolvePlatform({ platform: 'windows' });
    assert.equal(result.platform, null);
    assert.match(result.error ?? '', /--platform/);
  });
});
