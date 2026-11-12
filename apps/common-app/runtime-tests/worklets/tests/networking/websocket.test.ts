import {
  createWorkletRuntime,
  isBundleModeEnabled,
  runOnRuntimeSync,
  RuntimeKind,
} from 'react-native-worklets';

import {
  createTestValue,
  describe,
  expect,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { deriveEchoServerUrl } from '../../../ReJest/utils/serverUrl';
import { dispatchWorklet } from '../runLoop/dispatchWorklet';

const BASE_URL = deriveEchoServerUrl();

/** The echo endpoint of `apps/fabric-example/scripts/runtime-tests-server.js`. */
const SOCKET_URL = `${BASE_URL.replace(/^http/, 'ws')}/echo/ws`;

const describeFn = isBundleModeEnabled() ? describe : describe.skip;
const testFn = isBundleModeEnabled() ? test : test.skip;

describeFn('WebSocket (live)', () => {
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket opens and echoes a text frame, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_text_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => {
          if (socket.readyState !== 1) {
            setFlag(
              `wrong readyState on open: ${socket.readyState}`,
              notification
            );
            return;
          }
          socket.send('hello');
        };
        socket.onmessage = (event: { data: string | ArrayBuffer }) => {
          setFlag(
            event.data === 'hello' ? 'ok' : `wrong echo: ${String(event.data)}`,
            notification
          );
          socket.close();
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket echoes a frame sent from onopen 20 times in a row, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_onopen_send_repeat_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const runs = 20;
        const run = (index: number) => {
          if (index === runs) {
            setFlag('ok', notification);
            return;
          }
          const message = `onopen-${index}`;
          const socket = new globalThis.WebSocket(socketUrl);
          let echoed = false;
          socket.onerror = () =>
            setFlag(`socket errored in run ${index}`, notification);
          socket.onopen = () => socket.send(message);
          socket.onmessage = (event: { data: string | ArrayBuffer }) => {
            if (event.data !== message) {
              setFlag(
                `wrong echo in run ${index}: ${String(event.data)}`,
                notification
              );
              return;
            }
            echoed = true;
            socket.close();
          };
          socket.onclose = () => {
            if (!echoed) {
              setFlag(`no echo in run ${index}`, notification);
              return;
            }
            run(index + 1);
          };
        };
        run(0);
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket echoes a binary frame, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_binary_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.binaryType = 'arraybuffer';
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => {
          socket.send(new Uint8Array([1, 2, 3, 250]));
        };
        socket.onmessage = (event: { data: string | ArrayBuffer }) => {
          if (!(event.data instanceof ArrayBuffer)) {
            setFlag(`not binary: ${typeof event.data}`, notification);
          } else {
            const bytes = Array.from(new Uint8Array(event.data));
            setFlag(
              bytes.join(',') === '1,2,3,250'
                ? 'ok'
                : `wrong bytes: ${bytes.join(',')}`,
              notification
            );
          }
          socket.close();
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket delivers a Blob by default, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_blob_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => socket.send(new Uint8Array([7, 8, 9]));
        socket.onmessage = (event: {
          data: { __getBytes?: () => Uint8Array };
        }) => {
          if (socket.binaryType !== 'blob') {
            setFlag(`wrong binaryType: ${socket.binaryType}`, notification);
          } else if (typeof event.data.__getBytes !== 'function') {
            setFlag('not a Blob', notification);
          } else {
            const bytes = Array.from(event.data.__getBytes());
            setFlag(
              bytes.join(',') === '7,8,9'
                ? 'ok'
                : `wrong bytes: ${bytes.join(',')}`,
              notification
            );
          }
          socket.close();
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket reports a clean close with its code, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_close_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => {
          socket.close(3001, 'done');
        };
        socket.onclose = (event: {
          code: number;
          reason: string;
          wasClean: boolean;
        }) => {
          if (socket.readyState !== 3) {
            setFlag(`wrong readyState: ${socket.readyState}`, notification);
          } else if (event.code !== 3001) {
            setFlag(`wrong code: ${event.code}`, notification);
          } else if (event.reason !== 'done') {
            setFlag(`wrong reason: ${event.reason}`, notification);
          } else if (event.wasClean !== true) {
            setFlag(`not clean: ${String(event.wasClean)}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket reports a failed connection, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_failure_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      dispatchWorklet(() => {
        'worklet';
        /**
         * Port 9 is the discard service. Nothing in the test harness can bind
         * it, so this cannot collide with a parallel run the way a port derived
         * from the echo port could.
         */
        const socket = new globalThis.WebSocket('ws://127.0.0.1:9/echo/ws');
        let sawError = false;
        socket.onmessage = () => setFlag('unexpected message', notification);
        socket.onerror = () => {
          sawError = true;
        };
        socket.onclose = (event: { code: number; wasClean: boolean }) => {
          if (event.wasClean !== false) {
            setFlag(
              `unexpectedly clean: ${String(event.wasClean)}`,
              notification
            );
          } else if (event.code !== 1006) {
            setFlag(`wrong code: ${event.code}`, notification);
          } else if (!sawError) {
            setFlag('no error event before close', notification);
          } else {
            setFlag('ok', notification);
          }
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket reports 1005 when closed without a code, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_no_status_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => {
          socket.close();
        };
        socket.onclose = (event: {
          code: number;
          reason: string;
          wasClean: boolean;
        }) => {
          if (event.code !== 1005) {
            setFlag(`wrong code: ${event.code}`, notification);
          } else if (event.reason !== '') {
            setFlag(`wrong reason: ${event.reason}`, notification);
          } else if (event.wasClean !== true) {
            setFlag(`not clean: ${String(event.wasClean)}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket round-trips a text frame containing NUL, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_nul_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const payload = 'a\u0000b';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => socket.send(payload);
        socket.onmessage = (event: { data: string | ArrayBuffer }) => {
          setFlag(
            event.data === payload
              ? 'ok'
              : `truncated to length ${String(event.data).length}`,
            notification
          );
          socket.close();
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket keeps two sockets independent, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_independent_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const received: string[] = [];
        let openCount = 0;
        let settled = false;
        const settle = () => {
          if (received.length < 2 || settled) {
            return;
          }
          settled = true;
          received.sort();
          if (openCount !== 2) {
            setFlag(`wrong open count: ${openCount}`, notification);
            return;
          }
          setFlag(
            received.join(',') === 'first,second'
              ? 'ok'
              : `wrong echoes: ${received.join(',')}`,
            notification
          );
        };
        const open = (message: string) => {
          const socket = new globalThis.WebSocket(socketUrl);
          socket.onerror = () => setFlag('socket errored', notification);
          socket.onopen = () => {
            openCount++;
            socket.send(message);
          };
          socket.onmessage = (event: { data: string | ArrayBuffer }) => {
            received.push(String(event.data));
            socket.close();
            settle();
          };
        };
        open('first');
        open('second');
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );
  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket handles a server-initiated close, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_server_close_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(
          `${socketUrl}?close=3002&reason=server`
        );
        socket.onclose = (event: {
          code: number;
          reason: string;
          wasClean: boolean;
        }) => {
          if (event.code !== 3002) {
            setFlag(`wrong code: ${event.code}`, notification);
          } else if (event.reason !== 'server') {
            setFlag(`wrong reason: ${event.reason}`, notification);
          } else if (event.wasClean !== true) {
            setFlag(`not clean: ${String(event.wasClean)}`, notification);
          } else {
            setFlag('ok', notification);
          }
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket negotiates a subprotocol, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_protocol_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl, [
          'chat',
          'superchat',
        ]);
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => {
          setFlag(
            socket.protocol === 'chat'
              ? 'ok'
              : `wrong protocol: '${socket.protocol}'`,
            notification
          );
          socket.close();
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket survives invalid UTF-8 in a text frame, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_bad_utf8_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        /**
         * The platforms disagree. NSURLSession fails the connection, which is
         * what https://www.rfc-editor.org/rfc/rfc6455#section-8.1 requires.
         * OkHttp decodes the bytes with replacement characters and delivers the
         * frame, and by then the original bytes are gone, so a repaired frame
         * cannot be told from a genuine U+FFFD. Either outcome is safe, which
         * is what this asserts.
         */
        const socket = new globalThis.WebSocket(`${socketUrl}?invalidUtf8=1`);
        socket.onmessage = (event: { data: string | ArrayBuffer }) => {
          const codes = Array.from(String(event.data))
            .map((character) => character.charCodeAt(0).toString(16))
            .join(',');
          setFlag(
            codes === '61,fffd,62' ? 'ok' : `wrong: ${codes}`,
            notification
          );
          socket.close();
        };
        socket.onclose = (event: { wasClean: boolean }) => {
          if (event.wasClean === false) {
            setFlag('ok', notification);
          }
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket round-trips a large frame and keeps order, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_large_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.binaryType = 'arraybuffer';
        const received: number[] = [];
        let sawLarge = false;
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => {
          const large = new Uint8Array(256 * 1024);
          for (let i = 0; i < large.length; i++) {
            large[i] = i % 256;
          }
          socket.send(large);
          for (let i = 0; i < 10; i++) {
            socket.send(`frame-${i}`);
          }
        };
        socket.onmessage = (event: { data: string | ArrayBuffer }) => {
          if (event.data instanceof ArrayBuffer) {
            const bytes = new Uint8Array(event.data);
            const last = bytes.length - 1;
            if (
              bytes.length !== 256 * 1024 ||
              bytes[0] !== 0 ||
              bytes[1000] !== 1000 % 256 ||
              bytes[last] !== last % 256
            ) {
              setFlag(`bad large frame: ${bytes.length}`, notification);
              return;
            }
            sawLarge = true;
            return;
          }
          received.push(Number(String(event.data).slice('frame-'.length)));
          if (received.length === 10) {
            if (!sawLarge) {
              setFlag('the large frame never arrived', notification);
            } else {
              setFlag(
                received.join(',') === '0,1,2,3,4,5,6,7,8,9'
                  ? 'ok'
                  : `out of order: ${received.join(',')}`,
                notification
              );
            }
            socket.close();
          }
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket round-trips multi-byte UTF-8, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_utf8_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const payload = 'zazolc gesla jazn 😀 𝔘 é';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => socket.send(payload);
        socket.onmessage = (event: { data: string | ArrayBuffer }) => {
          setFlag(
            event.data === payload
              ? 'ok'
              : `wrong echo: ${String(event.data).length} vs ${payload.length}`,
            notification
          );
          socket.close();
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  test.each([RuntimeKind.UI, RuntimeKind.Worker])(
    'WebSocket drains bufferedAmount, runtime: **%s**',
    async (runtimeKind) => {
      const notification = `ws_buffered_done_${runtimeKind}`;
      const [flag, setFlag] = createTestValue('not_ok');
      const socketUrl = SOCKET_URL;

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.onerror = () => setFlag('socket errored', notification);
        socket.onopen = () => {
          socket.send(new Uint8Array(64 * 1024));
          /**
           * IOS reports the flush once the frame reaches the transport, so the
           * count is still pending here. OkHttp reports it at enqueue, so on
           * Android it can already be back to zero. Both are valid; what must
           * hold is that it was counted and ends at zero.
           */
          const counted = socket.bufferedAmount;
          if (counted !== 64 * 1024 && counted !== 0) {
            setFlag(`not counted: ${counted}`, notification);
            return;
          }
          let ticks = 0;
          const poll = () => {
            if (socket.bufferedAmount === 0) {
              setFlag('ok', notification);
              socket.close();
              return;
            }
            if (++ticks > 50) {
              setFlag(`never drained: ${socket.bufferedAmount}`, notification);
              socket.close();
              return;
            }
            setTimeout(poll, 20);
          };
          poll();
        };
      }, runtimeKind);

      await waitForNotification(notification);
      expect(flag.value).toBe('ok');
    }
  );

  /**
   * There is no dispose API, and letting the handle leave scope does not
   * collect the runtime, so this is a smoke test that an abandoned runtime with
   * an open socket does not break the next one - not teardown coverage.
   */
  testFn(
    'WebSocket survives an abandoned runtime with a socket open',
    async () => {
      const socketUrl = SOCKET_URL;
      const [flag, setFlag] = createTestValue('not_ok');

      {
        const doomedRuntime = createWorkletRuntime({ name: 'doomedSocket' });
        runOnRuntimeSync(doomedRuntime, () => {
          'worklet';
          const socket = new globalThis.WebSocket(socketUrl);
          socket.onopen = () => socket.send('never read');
          return true;
        });
      }

      dispatchWorklet(() => {
        'worklet';
        const socket = new globalThis.WebSocket(socketUrl);
        socket.onerror = () => setFlag('socket errored', 'ws_teardown_done');
        socket.onopen = () => socket.send('still works');
        socket.onmessage = (event: { data: string | ArrayBuffer }) => {
          setFlag(
            event.data === 'still works' ? 'ok' : 'wrong echo',
            'ws_teardown_done'
          );
          socket.close();
        };
      }, RuntimeKind.Worker);

      await waitForNotification('ws_teardown_done');
      expect(flag.value).toBe('ok');
    }
  );
});
