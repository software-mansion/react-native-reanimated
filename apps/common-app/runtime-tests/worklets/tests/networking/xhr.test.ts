import axios from 'axios';
import { isBundleModeEnabled, RuntimeKind } from 'react-native-worklets';

import {
  createTestValue,
  describe,
  expect,
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

describeFn('XMLHttpRequest (live)', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest reports readyState and progress, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_state_done_${runtimeKind}`;
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
          // LOADING is only reachable from a native download progress event,
          // so it is what proves progress actually reached JavaScript.
          const sawLoading = readyStates.includes(xhr.LOADING);
          const finishedLast = readyStates[readyStates.length - 1] === xhr.DONE;
          const contentLength = xhr.getResponseHeader('Content-Length');
          if (xhr.status !== 200) {
            setFlag(`wrong status: ${xhr.status}`, notification);
          } else if (!sawHeaders || !sawLoading || !finishedLast) {
            setFlag(
              `wrong readyStates: ${readyStates.join(',')}`,
              notification
            );
          } else if (progressEvents < 2) {
            setFlag(`too few progress events: ${progressEvents}`, notification);
          } else if (contentLength !== '262144') {
            setFlag(`wrong Content-Length: ${contentLength}`, notification);
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
    'XMLHttpRequest decodes UTF-8 text responses, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_text_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;
      const expectedText = EXPECTED_TEXT;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          if (xhr.responseText !== expectedText) {
            setFlag(`wrong text: ${xhr.responseText}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/text`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest replaces malformed UTF-8, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_invalid_utf8_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          if (xhr.responseText !== 'a�b') {
            const codes = Array.from(xhr.responseText)
              .map((character) => character.charCodeAt(0))
              .join(',');
            setFlag(`wrong decoding: ${codes}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/invalid-utf8`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest decodes iso-8859-1 as windows-1252, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_latin1_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          if (xhr.responseText !== '’') {
            setFlag(
              `wrong decoding: ${xhr.responseText.charCodeAt(0)}`,
              notification
            );
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/latin1`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest delivers arraybuffer responses, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_arraybuffer_done_${runtimeKind}`;
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
    'XMLHttpRequest round-trips request bodies, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_body_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;
      const expectedText = EXPECTED_TEXT;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          const data = JSON.parse(xhr.responseText) as {
            method: string;
            body: string;
            contentType: string | null;
          };
          if (data.method !== 'POST') {
            setFlag(`wrong method: ${data.method}`, notification);
          } else if (data.body !== expectedText) {
            setFlag(`wrong body: ${data.body}`, notification);
          } else if (data.contentType !== 'text/plain;charset=UTF-8') {
            setFlag(`wrong content type: ${data.contentType}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('POST', `${baseUrl}/echo/body`);
        xhr.send(expectedText);
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest sends only the view of a typed array, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_view_body_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const buffer = new Uint8Array([1, 2, 3, 4, 5, 6]).buffer;
        const view = new Uint8Array(buffer, 2, 3);
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          const data = JSON.parse(xhr.responseText) as {
            byteLength: number;
            bytes: Array<number>;
          };
          if (data.byteLength !== 3) {
            setFlag(`wrong length: ${data.byteLength}`, notification);
          } else if (data.bytes.join(',') !== '3,4,5') {
            setFlag(`wrong bytes: ${data.bytes.join(',')}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('POST', `${baseUrl}/echo/body`);
        xhr.send(view);
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest reports upload progress, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_upload_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const body = 'x'.repeat(512 * 1024);
        const xhr = new globalThis.XMLHttpRequest();
        let lastLoaded = -1;
        let uploadLoaded = false;
        xhr.upload.onprogress = (event) => {
          lastLoaded = event.loaded;
        };
        xhr.upload.onload = () => {
          uploadLoaded = true;
        };
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          if (!uploadLoaded) {
            setFlag('no upload load event', notification);
          } else if (lastLoaded !== body.length) {
            setFlag(`wrong upload progress: ${lastLoaded}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('POST', `${baseUrl}/echo/body`);
        xhr.send(body);
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest treats a 404 as a load, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_status_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () =>
          setFlag('fired error instead of load', notification);
        xhr.onload = () => {
          if (xhr.status !== 404) {
            setFlag(`wrong status: ${xhr.status}`, notification);
          } else if (xhr.responseText !== 'status 404') {
            setFlag(`wrong body: ${xhr.responseText}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/status?code=404`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest follows redirects and reports the final URL, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_redirect_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          if (xhr.status !== 200) {
            setFlag(`wrong status: ${xhr.status}`, notification);
          } else if (!xhr.responseURL.endsWith('/echo/text')) {
            setFlag(`wrong responseURL: ${xhr.responseURL}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/redirect?to=/echo/text`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest combines duplicate response headers, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_headers_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          const all = xhr.getAllResponseHeaders();
          if (xhr.getResponseHeader('X-DUP') !== 'one, two') {
            setFlag(
              `wrong duplicate join: ${xhr.getResponseHeader('X-DUP')}`,
              notification
            );
          } else if (xhr.getResponseHeader('x-mixed') !== 'value') {
            setFlag('case-insensitive lookup failed', notification);
          } else if (!all.includes('x-dup: one, two\r\n')) {
            setFlag(`wrong header list: ${all}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/headers`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest reports a connection failure as an error, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_network_error_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onload = () => setFlag('request completed', notification);
        xhr.ontimeout = () => setFlag('fired timeout', notification);
        xhr.onabort = () => setFlag('fired abort', notification);
        xhr.onerror = () => {
          if (xhr.readyState !== xhr.DONE) {
            setFlag(`wrong readyState: ${xhr.readyState}`, notification);
          } else if (xhr.status !== 0) {
            setFlag(`wrong status: ${xhr.status}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', 'http://127.0.0.1:1/nothing');
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest honors the timeout, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_timeout_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.timeout = 300;
        xhr.ontimeout = () => {
          xhr.onload = null;
          xhr.onerror = null;
          if (xhr.readyState !== xhr.DONE) {
            setFlag(`wrong readyState: ${xhr.readyState}`, notification);
          } else if (xhr.status !== 0) {
            setFlag(`wrong status: ${xhr.status}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
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
    'XMLHttpRequest aborts an in-flight request, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_abort_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        const events: Array<string> = [];
        xhr.onload = () => {
          events.push('load');
          setFlag('request completed', notification);
        };
        xhr.onerror = () => {
          events.push('error');
          setFlag('request errored', notification);
        };
        xhr.onabort = () => {
          events.push('abort');
        };
        xhr.onloadend = () => {
          events.push('loadend');
          if (events.join(',') !== 'abort,loadend') {
            setFlag(`wrong events: ${events.join(',')}`, notification);
          } else if (xhr.status !== 0) {
            setFlag(`wrong status: ${xhr.status}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/delay?ms=10000`);
        xhr.send();
        setTimeout(() => xhr.abort(), 100);
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest ignores an abort after completion, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_abort_after_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        let loadEndCount = 0;
        let readyStateAfterAbort = -1;
        let failure = '';
        xhr.onerror = () => {
          failure = failure || 'request errored';
        };
        xhr.onabort = () => {
          failure = failure || 'fired abort after done';
        };
        // `loadend` is fired after `load`, so the assertions run one task later.
        xhr.onload = () => {
          xhr.abort();
          readyStateAfterAbort = xhr.readyState;
        };
        xhr.onloadend = () => {
          loadEndCount++;
          if (loadEndCount > 1) {
            return;
          }
          setTimeout(() => {
            if (failure !== '') {
              setFlag(failure, notification);
            } else if (loadEndCount !== 1) {
              setFlag(`wrong loadend count: ${loadEndCount}`, notification);
            } else if (readyStateAfterAbort !== xhr.UNSENT) {
              setFlag(
                `wrong readyState: ${readyStateAfterAbort}`,
                notification
              );
            } else {
              setFlag('ok', notification);
            }
          });
        };
        xhr.open('GET', `${baseUrl}/echo/text`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest keeps concurrent requests independent, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_concurrent_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const sizes = [1024, 4096, 16384, 65536, 262144];
        let completed = 0;
        let failed = false;
        sizes.forEach((size) => {
          const xhr = new globalThis.XMLHttpRequest();
          xhr.responseType = 'arraybuffer';
          xhr.onerror = () => {
            failed = true;
            setFlag(`request for ${size} errored`, notification);
          };
          xhr.onload = () => {
            const buffer = xhr.response as ArrayBuffer;
            if (buffer.byteLength !== size) {
              failed = true;
              setFlag(`size ${size} got ${buffer.byteLength}`, notification);
              return;
            }
            completed++;
            if (completed === sizes.length && !failed) {
              setFlag('ok', notification);
            }
          };
          xhr.open('GET', `${baseUrl}/echo/binary?size=${size}`);
          xhr.send();
        });
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest rejects unsupported schemes and methods, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_guards_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');

      dispatchWorklet(() => {
        'worklet';
        const failures: Array<string> = [];
        const expectThrow = (label: string, action: () => void) => {
          try {
            action();
            failures.push(label);
          } catch {
            // Expected.
          }
        };
        expectThrow('empty url', () => {
          new globalThis.XMLHttpRequest().open('GET', '');
        });
        expectThrow('TRACE method', () => {
          new globalThis.XMLHttpRequest().open('TRACE', 'http://example.com/');
        });
        expectThrow('header injection', () => {
          const xhr = new globalThis.XMLHttpRequest();
          xhr.open('GET', 'http://example.com/');
          xhr.setRequestHeader('X-A', 'a\r\nX-Injected: b');
        });
        setFlag(
          failures.length === 0 ? 'ok' : failures.join(','),
          notification
        );
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest decodes the Encoding Standard cases, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_decoder_cases_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const cases: Array<[string, string]> = [
          ['replacement', 'a\uFFFDb'],
          ['valid-prefix', '\uFFFDA'],
          ['truncated', '\uFFFD'],
          ['overlong', '\uFFFD\uFFFD'],
          ['surrogate', '\uFFFD\uFFFD\uFFFD'],
          ['bom-utf8', 'café'],
          ['bom-utf16le', 'hi'],
          ['bom-utf16be', 'hi'],
          ['utf16le-surrogate-pair', '🚄'],
          ['utf16le-lone-surrogate', '\uFFFDi'],
          ['utf16le-odd-length', 'h\uFFFD'],
          ['four-byte', '🦄'],
        ];
        const failures: Array<string> = [];
        let pending = cases.length;
        cases.forEach(([name, expected]) => {
          const xhr = new globalThis.XMLHttpRequest();
          const finish = () => {
            pending--;
            if (pending === 0) {
              setFlag(
                failures.length === 0 ? 'ok' : failures.join(' | '),
                notification
              );
            }
          };
          xhr.onerror = () => {
            failures.push(`${name}: errored`);
            finish();
          };
          xhr.onload = () => {
            if (xhr.responseText !== expected) {
              const codes = Array.from(xhr.responseText)
                .map((character) => character.charCodeAt(0).toString(16))
                .join(',');
              failures.push(`${name}: ${codes}`);
            }
            finish();
          };
          // The BOM must override the declared encoding.
          const charset = name === 'bom-utf8' ? '&charset=iso-8859-1' : '';
          xhr.open('GET', `${baseUrl}/echo/utf8-cases?case=${name}${charset}`);
          xhr.send();
        });
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest decodes a legacy multi-byte charset, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_shift_jis_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          if (xhr.responseText !== '日本') {
            setFlag(`wrong decoding: ${xhr.responseText}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/shift-jis`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest replaces malformed legacy bytes, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_shift_jis_malformed_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          // A trailing lead byte must not discard the well-formed prefix.
          if (!xhr.responseText.startsWith('日本')) {
            const codes = Array.from(xhr.responseText)
              .map((character) => character.charCodeAt(0).toString(16))
              .join(',');
            setFlag(`wrong decoding: ${codes}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/shift-jis?malformed=1`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest drops credentials on a cross-origin redirect, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_redirect_credentials_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;
      const otherHost = baseUrl.includes('127.0.0.1')
        ? 'localhost'
        : '127.0.0.1';

      dispatchWorklet(() => {
        'worklet';
        const port = baseUrl.slice(baseUrl.lastIndexOf(':') + 1);
        const target = `http://${otherHost}:${port}/echo/echo-headers`;
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          const echoed = JSON.parse(xhr.responseText) as Record<
            string,
            unknown
          >;
          const names = Object.keys(echoed).map((name) => name.toLowerCase());
          if (names.includes('authorization')) {
            setFlag('authorization survived the redirect', notification);
          } else if (!xhr.responseURL.includes('/echo/echo-headers')) {
            setFlag(`wrong responseURL: ${xhr.responseURL}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open(
          'GET',
          `${baseUrl}/echo/redirect?to=${encodeURIComponent(target)}`
        );
        xhr.setRequestHeader('Authorization', 'Bearer secret');
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest handles a response without Content-Length, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_chunked_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        let lengthComputable = true;
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = (event) => {
          lengthComputable = event.lengthComputable;
          if (xhr.responseText !== 'chunk-onechunk-two') {
            setFlag(`wrong body: ${xhr.responseText}`, notification);
          } else if (xhr.getResponseHeader('content-length') !== null) {
            setFlag('unexpected Content-Length', notification);
          } else if (lengthComputable) {
            setFlag('reported a computable length', notification);
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('GET', `${baseUrl}/echo/chunked`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest sends Content-Length 0 for a bodyless POST, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_empty_post_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const xhr = new globalThis.XMLHttpRequest();
        xhr.onerror = () => setFlag('request errored', notification);
        xhr.onload = () => {
          const data = JSON.parse(xhr.responseText) as {
            contentLength: string | null;
            byteLength: number;
          };
          if (data.byteLength !== 0) {
            setFlag(`unexpected body: ${data.byteLength}`, notification);
          } else if (data.contentLength !== '0') {
            setFlag(
              `wrong Content-Length: ${data.contentLength}`,
              notification
            );
          } else {
            setFlag('ok', notification);
          }
        };
        xhr.open('POST', `${baseUrl}/echo/body`);
        xhr.send();
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest omits cookies when withCredentials is false, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_no_credentials_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        const echoedCookies = (responseText: string) => {
          const echoed = JSON.parse(responseText) as Record<string, unknown>;
          return Object.keys(echoed).some(
            (name) => name.toLowerCase() === 'cookie'
          );
        };

        const request = (
          path: string,
          withCredentials: boolean,
          onDone: (responseText: string) => void
        ) => {
          const xhr = new globalThis.XMLHttpRequest();
          xhr.withCredentials = withCredentials;
          xhr.onerror = () => setFlag(`${path} errored`, notification);
          xhr.onload = () => onDone(xhr.responseText);
          xhr.open('GET', `${baseUrl}${path}`);
          xhr.send();
        };

        request('/echo/set-cookie', true, () => {
          // Positive control: without it, "no cookie" proves nothing.
          request('/echo/echo-headers', true, (withCredentialsBody) => {
            if (!echoedCookies(withCredentialsBody)) {
              setFlag('cookie was not sent with credentials', notification);
              return;
            }
            request('/echo/echo-headers', false, (withoutCredentialsBody) => {
              setFlag(
                echoedCookies(withoutCredentialsBody)
                  ? 'cookie sent without credentials'
                  : 'ok',
                notification
              );
            });
          });
        });
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'XMLHttpRequest keeps credentialled and credentialless requests apart, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `xhr_mixed_credentials_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const baseUrl = BASE_URL;

      dispatchWorklet(() => {
        'worklet';
        // The two requests land on different NSURLSessions on Apple platforms,
        // whose task identifiers are only unique per session.
        const sizes: Array<[boolean, number]> = [
          [true, 262144],
          [false, 1024],
        ];
        const failures: Array<string> = [];
        let pending = sizes.length;
        sizes.forEach(([withCredentials, size]) => {
          const xhr = new globalThis.XMLHttpRequest();
          xhr.withCredentials = withCredentials;
          xhr.responseType = 'arraybuffer';
          const finish = () => {
            pending--;
            if (pending === 0) {
              setFlag(
                failures.length === 0 ? 'ok' : failures.join(' | '),
                notification
              );
            }
          };
          xhr.onerror = () => {
            failures.push(`size ${size} errored`);
            finish();
          };
          xhr.onload = () => {
            const buffer = xhr.response as ArrayBuffer;
            if (buffer.byteLength !== size) {
              failures.push(`size ${size} got ${buffer.byteLength}`);
            }
            finish();
          };
          xhr.open('GET', `${baseUrl}/echo/binary?size=${size}`);
          xhr.send();
        });
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'supports Axios on top of XMLHttpRequest, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `axios_done_${runtimeKind}`;
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
              setFlag('ok', notification);
            } else {
              setFlag(`wrong payload: ${JSON.stringify(data)}`, notification);
            }
          })
          .catch((error) => {
            setFlag(String(error), notification);
          });
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );
});
