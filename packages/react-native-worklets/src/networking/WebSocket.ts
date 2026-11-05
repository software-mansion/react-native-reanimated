'use strict';

import { Blob } from './Blob';
import { toArrayBuffer } from './bytes';
import { DOMException } from './DOMException';
import { EventTargetLite } from './events';
import { isToken } from './http';
import { utf8Encode } from './utf8';

type SocketEvent =
  | { type: 'open'; payload: { protocol: string; extensions?: string } }
  | { type: 'flushed'; payload: { bytes: number } }
  | { type: 'message'; payload: { text?: string; binary?: ArrayBuffer } }
  | { type: 'error'; payload: { message: string } }
  | {
      type: 'close';
      payload: { code: number; reason: string; wasClean: boolean };
    };

const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

const NORMAL_CLOSURE = 1000;
const NO_STATUS_RECEIVED = 1005;
/** Only used internally; `close()` does not accept it. */
const PROTOCOL_ERROR = 1002;

export class WebSocket extends EventTargetLite {
  static readonly CONNECTING = CONNECTING;
  static readonly OPEN = OPEN;
  static readonly CLOSING = CLOSING;
  static readonly CLOSED = CLOSED;

  readonly CONNECTING = CONNECTING;
  readonly OPEN = OPEN;
  readonly CLOSING = CLOSING;
  readonly CLOSED = CLOSED;

  readonly url: string;
  private readonly origin: string;
  private requestedProtocols: string[] = [];
  private settled = false;

  get onopen() {
    return this.__getHandler('open');
  }

  set onopen(value) {
    this.__setHandler('open', value);
  }

  get onmessage() {
    return this.__getHandler('message');
  }

  set onmessage(value) {
    this.__setHandler('message', value);
  }

  get onerror() {
    return this.__getHandler('error');
  }

  set onerror(value) {
    this.__setHandler('error', value);
  }

  get onclose() {
    return this.__getHandler('close');
  }

  set onclose(value) {
    this.__setHandler('close', value);
  }
  readyState: number = CONNECTING;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;

  private socketId: number | undefined;
  private binaryTypeValue: 'arraybuffer' | 'blob' = 'blob';

  get binaryType(): 'arraybuffer' | 'blob' {
    return this.binaryTypeValue;
  }

  set binaryType(value: 'arraybuffer' | 'blob') {
    if (value === 'blob' || value === 'arraybuffer') {
      this.binaryTypeValue = value;
    }
  }

  constructor(url: string, protocols?: string | string[]) {
    super();

    const parsed = parseUrl(url);
    this.url = parsed;
    this.origin = originOf(parsed);

    const protocolList =
      protocols === undefined
        ? []
        : typeof protocols === 'string'
          ? [protocols]
          : [...protocols];
    assertDistinctProtocols(protocolList);
    this.requestedProtocols = protocolList;

    let constructing = true;
    const deferred: SocketEvent[] = [];
    this.socketId = globalThis.__workletsNetworking!.connectWebSocket(
      { url: parsed, protocols: protocolList, headers: [] },
      (type: string, payload: unknown) => {
        const event = { type, payload } as SocketEvent;
        if (constructing) {
          deferred.push(event);
          return;
        }
        this.handleEvent(event);
      }
    );
    constructing = false;
    if (deferred.length > 0) {
      queueMicrotask(() => {
        for (const event of deferred) {
          this.handleEvent(event);
        }
      });
    }
  }

  send(data: string | ArrayBuffer | ArrayBufferView | Blob) {
    if (this.readyState === CONNECTING) {
      throw new DOMException(
        "[Worklets] Failed to execute 'send' on 'WebSocket': still in CONNECTING state.",
        'InvalidStateError'
      );
    }
    const payload = typeof data === 'string' ? data : toBuffer(data);
    if (typeof payload !== 'string' && !(payload instanceof ArrayBuffer)) {
      throw new TypeError(
        "[Worklets] Failed to execute 'send' on 'WebSocket': the message must be a string, an ArrayBuffer, an ArrayBufferView or a Blob."
      );
    }
    this.bufferedAmount +=
      typeof payload === 'string'
        ? utf8Encode(payload).length
        : payload.byteLength;
    if (this.readyState !== OPEN || this.socketId === undefined) {
      return;
    }
    globalThis.__workletsNetworking!.sendWebSocketMessage(
      this.socketId,
      payload
    );
  }

  close(code?: number, reason?: string) {
    if (
      code !== undefined &&
      (!Number.isInteger(code) ||
        (code !== NORMAL_CLOSURE && (code < 3000 || code > 4999)))
    ) {
      throw new DOMException(
        "[Worklets] Failed to execute 'close' on 'WebSocket': the code must be 1000 or between 3000 and 4999.",
        'InvalidAccessError'
      );
    }
    const encodedReason = reason === undefined ? '' : reason;
    if (utf8Encode(encodedReason).length > 123) {
      throw new DOMException(
        "[Worklets] Failed to execute 'close' on 'WebSocket': the reason must not be longer than 123 bytes.",
        'SyntaxError'
      );
    }
    if (this.readyState === CLOSING || this.readyState === CLOSED) {
      return;
    }
    this.readyState = CLOSING;
    if (this.socketId !== undefined) {
      globalThis.__workletsNetworking!.closeWebSocket(
        this.socketId,
        code ?? NO_STATUS_RECEIVED,
        encodedReason
      );
    }
  }

  private failConnection(message: string) {
    if (this.socketId !== undefined) {
      globalThis.__workletsNetworking!.closeWebSocket(
        this.socketId,
        PROTOCOL_ERROR,
        ''
      );
    }
    this.settled = true;
    this.readyState = CLOSED;
    this.socketId = undefined;
    this.__dispatch('error', { message: `[Worklets] ${message}.` });
    this.__dispatch('close', { code: 1006, reason: '', wasClean: false });
  }

  private handleEvent(event: SocketEvent) {
    if (this.settled) {
      return;
    }
    switch (event.type) {
      case 'open':
        if (this.readyState !== CONNECTING) {
          return;
        }
        if (
          this.requestedProtocols.length > 0 &&
          event.payload.protocol === ''
        ) {
          /**
           * https://websockets.spec.whatwg.org/#the-websocket-interface - a
           * subprotocol the client requested but the server did not acknowledge
           * fails the connection.
           */
          this.failConnection(
            'the server did not acknowledge any of the requested subprotocols'
          );
          return;
        }
        if (
          event.payload.protocol !== '' &&
          !this.requestedProtocols.includes(event.payload.protocol)
        ) {
          /**
           * https://www.rfc-editor.org/rfc/rfc6455#section-4.1 - a server that
           * names a subprotocol the client did not offer must fail the socket.
           */
          this.failConnection(
            `the server chose the subprotocol '${event.payload.protocol}', which was not requested`
          );
          return;
        }
        this.readyState = OPEN;
        this.protocol = event.payload.protocol;
        this.extensions = event.payload.extensions ?? '';
        this.__dispatch('open', {});
        break;
      case 'message': {
        if (this.readyState !== OPEN) {
          return;
        }
        const data =
          event.payload.text !== undefined
            ? event.payload.text
            : this.binaryType === 'blob'
              ? new Blob([event.payload.binary!])
              : event.payload.binary!;
        this.__dispatch('message', {
          data,
          origin: this.origin,
          lastEventId: '',
        });
        break;
      }
      case 'flushed':
        this.bufferedAmount = Math.max(
          0,
          this.bufferedAmount - event.payload.bytes
        );
        break;
      case 'error':
        this.__dispatch('error', { message: event.payload.message });
        break;
      case 'close':
        this.settled = true;
        this.readyState = CLOSED;
        this.socketId = undefined;
        this.__dispatch('close', {
          code: event.payload.code,
          reason: event.payload.reason,
          wasClean: event.payload.wasClean,
        });
        break;
    }
  }
}

/**
 * https://url.spec.whatwg.org/#concept-url-serializer - the host is lowercased,
 * a default port is dropped and an empty path becomes `/`, so two spellings of
 * one endpoint produce one `url`.
 */
function canonicalize(scheme: string, rest: string): string {
  const withoutSlashes = rest.replace(/^\/\//, '');
  const end = withoutSlashes.search(/[/?]/);
  const authority = end === -1 ? withoutSlashes : withoutSlashes.slice(0, end);
  const remainder = end === -1 ? '' : withoutSlashes.slice(end);
  // The path comes before the query, so an empty path still serializes as `/`.
  const suffix = remainder.startsWith('?') ? `/${remainder}` : remainder || '/';

  // Only the host is lowercased; userinfo and the query keep their case.
  const userinfoAt = authority.lastIndexOf('@');
  const userinfo =
    userinfoAt === -1 ? '' : `${authority.slice(0, userinfoAt + 1)}`;
  let host = authority.slice(userinfoAt + 1);
  let portSuffix = '';
  const portAt = host.lastIndexOf(':');
  const bracketAt = host.lastIndexOf(']');
  if (portAt > bracketAt) {
    const port = host.slice(portAt + 1);
    if (!/^[0-9]*$/.test(port)) {
      throw new DOMException(
        `[Worklets] Failed to construct 'WebSocket': the URL has an invalid port.`,
        'SyntaxError'
      );
    }
    if (port !== '' && Number(port) > 65535) {
      throw new DOMException(
        `[Worklets] Failed to construct 'WebSocket': the URL has a port above 65535.`,
        'SyntaxError'
      );
    }
    const defaultPort = scheme === 'wss' ? 443 : 80;
    host = host.slice(0, portAt);
    if (port !== '' && Number(port) !== defaultPort) {
      portSuffix = `:${port}`;
    }
  }
  if (host === '') {
    throw new DOMException(
      `[Worklets] Failed to construct 'WebSocket': the URL has no host.`,
      'SyntaxError'
    );
  }
  return `${scheme}://${userinfo}${host.toLowerCase()}${portSuffix}${suffix}`;
}

/** https://url.spec.whatwg.org/#origin - ws and wss are their own origin scheme. */
function originOf(url: string): string {
  const scheme = url.startsWith('wss:') ? 'wss' : 'ws';
  const withoutScheme = url.slice(url.indexOf('://') + 3);
  const authority = withoutScheme.split(/[/?]/)[0];
  const host = authority.slice(authority.lastIndexOf('@') + 1);
  return `${scheme}://${host}`;
}

function toBuffer(data: ArrayBuffer | ArrayBufferView | Blob): ArrayBuffer {
  if (ArrayBuffer.isView(data)) {
    return toArrayBuffer(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    );
  }
  if (data instanceof Blob) {
    return toArrayBuffer(data.__getBytes());
  }
  return data;
}

function parseUrl(url: string): string {
  if (url.includes('#')) {
    throw new DOMException(
      `[Worklets] Failed to construct 'WebSocket': the URL must not have a fragment, got '${url}'.`,
      'SyntaxError'
    );
  }
  const match = /^([A-Za-z][A-Za-z0-9+\-.]*):/.exec(url);
  const scheme = match?.[1]?.toLowerCase();
  if (scheme === 'ws' || scheme === 'wss') {
    return canonicalize(scheme, url.slice(scheme.length + 1));
  }
  if (scheme === 'http') {
    return canonicalize('ws', url.slice(5));
  }
  if (scheme === 'https') {
    return canonicalize('wss', url.slice(6));
  }
  throw new DOMException(
    `[Worklets] Failed to construct 'WebSocket': only ws and wss URLs are supported, got '${url}'.`,
    'SyntaxError'
  );
}

function assertDistinctProtocols(protocols: string[]) {
  const seen = new Set<string>();
  for (const protocol of protocols) {
    if (!isToken(protocol)) {
      throw new DOMException(
        `[Worklets] Failed to construct 'WebSocket': '${protocol}' is not a valid subprotocol.`,
        'SyntaxError'
      );
    }
    if (seen.has(protocol)) {
      throw new DOMException(
        `[Worklets] Failed to construct 'WebSocket': the subprotocol '${protocol}' is repeated.`,
        'SyntaxError'
      );
    }
    seen.add(protocol);
  }
}
