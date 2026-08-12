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

  let host = 'localhost';
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
    return override;
  }

  const { host, port } = deriveServerHostPort();
  return `ws://${host}:${port}`;
}

/**
 * Base URL of the plain-HTTP echo endpoints served by
 * `runtime-tests-server.js` on the same port as its WebSocket harness.
 */
export function deriveEchoServerUrl(): string {
  return deriveWsUrl().replace(/^ws/, 'http');
}
