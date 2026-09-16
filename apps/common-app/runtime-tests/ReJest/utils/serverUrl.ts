import { NativeModules, Platform } from 'react-native';

const DEFAULT_PORT = 8082;

interface SourceCodeConstants {
  scriptURL?: string;
}

interface SourceCodeModule {
  getConstants?: () => SourceCodeConstants;
}

function deriveServerHostPort(): { host: string; port: number } {
  const sourceCode = (NativeModules as { SourceCode?: SourceCodeModule })
    .SourceCode;
  const scriptURL = sourceCode?.getConstants?.()?.scriptURL;

  let host = '127.0.0.1';
  let port = DEFAULT_PORT;
  if (scriptURL) {
    const match = /^https?:\/\/([^/:]+)(?::(\d+))?\//.exec(scriptURL);
    if (match) {
      host = match[1];
      if (match[2]) {
        port = Number(match[2]) + 1;
      }
    }
  } else if (Platform.OS === 'android') {
    host = '10.0.2.2';
  }

  return { host, port };
}

export function deriveWsUrl(): string {
  // eslint-disable-next-line no-underscore-dangle
  const override = (globalThis as { __RUNTIME_TESTS_WS_URL__?: string })
    .__RUNTIME_TESTS_WS_URL__;
  if (override) {
    return stripTrailingSlash(override);
  }

  const { host, port } = deriveServerHostPort();
  return `ws://${host}:${port}`;
}

/**
 * Base URL of the plain-HTTP echo endpoints served by `runtime-tests-server.js`
 * on the same port as its WebSocket harness. It never ends with a slash, so
 * callers can append a path directly.
 */
export function deriveEchoServerUrl(): string {
  const wsUrl = deriveWsUrl();
  const match = /^(wss?)(:\/\/.*)$/.exec(wsUrl);
  if (match === null) {
    throw new Error(
      `[RuntimeTests] Expected a ws:// or wss:// server URL, got '${wsUrl}'.`
    );
  }
  return `${match[1] === 'wss' ? 'https' : 'http'}${match[2]}`;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
