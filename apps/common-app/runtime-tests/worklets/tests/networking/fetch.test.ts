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

/** Must match `ECHO_TEXT` in `apps/fabric-example/scripts/runtime-tests-server.js`. */
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
                setFlag(`wrong byte at ${index}: ${bytes[index]}`, notification);
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
    'XMLHttpRequest reports readyState and progress, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'xhr_state_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        const readyStates: Array<number> = [];
        let progressEvents = 0;
        xhr.onreadystatechange = () => {
          readyStates.push(xhr.readyState);
        };
        xhr.onprogress = () => {
          progressEvents++;
        };
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          const sawHeaders = readyStates.includes(xhr.HEADERS_RECEIVED);
          const finishedLast = readyStates[readyStates.length - 1] === xhr.DONE;
          const contentLength = xhr.getResponseHeader('Content-Length');
          if (xhr.status !== 200) {
            setFlag(`wrong status: ${xhr.status}`, notification);
          } else if (!sawHeaders || !finishedLast) {
            setFlag(`wrong readyStates: ${readyStates.join(',')}`, notification);
          } else if (progressEvents < 1) {
            setFlag('no progress events', notification);
          } else if (contentLength !== '262144') {
            setFlag(`wrong Content-Length: ${contentLength}`, notification);
          } else if ((xhr.response as string).length !== 262144) {
            setFlag('wrong response length', notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/binary?size=262144`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest delivers arraybuffer responses, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'xhr_arraybuffer_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.responseType = 'arraybuffer';
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          const buffer = xhr.response as ArrayBuffer;
          if (!(buffer instanceof ArrayBuffer)) {
            setFlag('response is not an ArrayBuffer', notification);
          } else if (buffer.byteLength !== 1024) {
            setFlag(`wrong length: ${buffer.byteLength}`, notification);
          } else if (new Uint8Array(buffer)[255] !== 255) {
            setFlag('wrong content', notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/binary?size=1024`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest honors the timeout, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'xhr_timeout_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.timeout = 300;
        xhr.ontimeout = () => setFlag('ok', notification);
        xhr.onload = () => setFlag('request completed', notification);
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.open('GET', `${baseUrl}/echo/delay?ms=10000`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'aborts fetch through AbortController, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'fetch_abort_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const controller = new AbortController();
        fetch(`${baseUrl}/echo/delay?ms=10000`, { signal: controller.signal })
          .then(() => setFlag('request completed', notification))
          .catch((error: Error) => setFlag(error.name, notification));
        setTimeout(() => controller.abort(), 200);
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('AbortError');
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
    'posts FormData as multipart, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'formdata_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const formData = new FormData();
        formData.append('field', 'value');
        formData.append('emoji', '🦄');
        fetch(`${baseUrl}/echo/body`, { body: formData, method: 'POST' })
          .then((response) => response.json())
          .then((echo: { method: string; contentType: string; body: string }) => {
            if (echo.method !== 'POST') {
              setFlag(`wrong method: ${echo.method}`, notification);
            } else if (
              !echo.contentType?.startsWith('multipart/form-data; boundary=')
            ) {
              setFlag(`wrong content type: ${echo.contentType}`, notification);
            } else if (
              !echo.body.includes('name="field"') ||
              !echo.body.includes('value') ||
              !echo.body.includes('🦄')
            ) {
              setFlag(`wrong body: ${echo.body}`, notification);
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

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'supports Axios on top of XMLHttpRequest, runtime: **%s**',
    async (runtimeKind) => {
      const notification = 'axios_done';
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;
      const expectedText = EXPECTED_TEXT;

      dispatchWorklet(() => {
        'worklet';
        axios
          .get(`${baseUrl}/echo/json`)
          .then((response) => {
            const data = response.data as { id: number; title: string };
            if (data.id === 1 && data.title === expectedText) {
              setFlag('ok');
            } else {
              setFlag(`wrong payload: ${JSON.stringify(data)}`);
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
});
