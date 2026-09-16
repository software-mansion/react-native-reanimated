import axios from 'axios';
import { isBundleModeEnabled, RuntimeKind } from 'react-native-worklets';

import {
  createTestValue,
  describe,
  expect,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { deriveEchoServerUrl } from '../../../ReJest/utils/serverUrl';
import { dispatchWorklet } from '../runLoop/dispatchWorklet';

/**
 * Must match `ECHO_TEXT` in
 * `apps/fabric-example/scripts/runtime-tests-server.js`.
 */
const EXPECTED_TEXT = 'Zażółć gęślą jaźń — 中文字 — 🦄';

const BASE_URL = deriveEchoServerUrl();

const describeFn = isBundleModeEnabled() ? describe : describe.skip;

describeFn('networking (live)', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'fetches JSON, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'fetch_json_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;
      const expectedText = EXPECTED_TEXT;

      dispatchWorklet(() => {
        'worklet';
        fetch(`${baseUrl}/echo/json`)
          .then((response) => response.json())
          .then((json: { id: number; title: string; completed: boolean }) => {
            if (
              json.id === 1 &&
              json.title === expectedText &&
              json.completed === false
            ) {
              setFlag('ok');
            } else {
              setFlag(`wrong payload: ${JSON.stringify(json)}`);
            }
            notify(notification);
          })
          .catch((error) => {
            setFlag(String(error));
            notify(notification);
          });
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'fetches UTF-8 text without corruption, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'fetch_text_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        fetch(`${baseUrl}/echo/text`)
          .then((response) => response.text())
          .then((text) => setFlag(text, notification))
          .catch((error) => setFlag(String(error), notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe(EXPECTED_TEXT);
    }
  );
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'reads binary responses through fetch, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'fetch_binary_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        fetch(`${baseUrl}/echo/binary?size=2048`)
          .then((response) => response.arrayBuffer())
          .then((buffer) => {
            if (buffer.byteLength !== 2048) {
              setFlag(`wrong length: ${buffer.byteLength}`, notification);
              return;
            }
            const bytes = new Uint8Array(buffer);
            for (const index of [0, 1, 255, 256, 1024, 2047]) {
              if (bytes[index] !== index % 256) {
                setFlag(
                  `wrong byte at ${index}: ${bytes[index]}`,
                  notification
                );
                return;
              }
            }
            setFlag('ok', notification);
          })
          .catch((error) => setFlag(String(error), notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'resolves fetch on error statuses, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'fetch_status_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        fetch(`${baseUrl}/echo/status?code=404`)
          .then((response) => {
            if (response.ok === false && response.status === 404) {
              setFlag('ok', notification);
            } else {
              setFlag(`wrong status: ${response.status}`, notification);
            }
          })
          .catch((error) => setFlag(String(error), notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'rejects fetch on network failures, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'fetch_network_error_done';
      const [flag, setFlag] = createTestValue('not_ok');

      dispatchWorklet(() => {
        'worklet';
        fetch('http://127.0.0.1:1/unreachable')
          .then(() => setFlag('request completed', notification))
          .catch(() => setFlag('ok', notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'posts UTF-8 string bodies, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'string_body_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;
      const expectedText = EXPECTED_TEXT;

      dispatchWorklet(() => {
        'worklet';
        fetch(`${baseUrl}/echo/body`, { body: expectedText, method: 'POST' })
          .then((response) => response.json())
          .then((echo: { body: string; byteLength: number }) => {
            if (echo.body !== expectedText) {
              setFlag(`wrong body: ${echo.body}`, notification);
            } else if (echo.byteLength <= expectedText.length) {
              setFlag(`wrong byte length: ${echo.byteLength}`, notification);
            } else {
              setFlag('ok', notification);
            }
          })
          .catch((error) => setFlag(String(error), notification));
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );
});
