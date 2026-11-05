import { Blob } from '../src/networking/Blob';
import { toArrayBuffer } from '../src/networking/bytes';
import { utf8Decode, utf8Encode } from '../src/networking/utf8';
import { WebSocket } from '../src/networking/WebSocket';

type OpenedSocket = {
  socketId: number;
  config: { url: string; protocols: string[]; headers: Array<[string, string]> };
  emit: (type: string, payload: unknown) => void;
};

const openedSockets: OpenedSocket[] = [];
const sentMessages: Array<{ socketId: number; message: string | ArrayBuffer }> =
  [];
const closedSockets: Array<{
  socketId: number;
  code: number;
  reason: string;
}> = [];
let nextSocketId = 1;

beforeEach(() => {
  openedSockets.length = 0;
  sentMessages.length = 0;
  closedSockets.length = 0;
  nextSocketId = 1;
  globalThis.__workletsNetworking = {
    sendRequest() {
      throw new Error('not used in this suite');
    },
    abortRequest() {},
    decodeText(buffer) {
      return utf8Decode(new Uint8Array(buffer));
    },
    connectWebSocket(config, onEvent) {
      const socketId = nextSocketId++;
      openedSockets.push({ socketId, config, emit: onEvent });
      return socketId;
    },
    sendWebSocketMessage(socketId, message) {
      sentMessages.push({ socketId, message });
    },
    closeWebSocket(socketId, code, reason) {
      // Mirrors the gate in NetworkingInstaller.cpp, so a close the native
      // layer would silently drop fails here instead.
      const reserved =
        (code >= 1004 && code <= 1006) || (code >= 1015 && code <= 2999);
      if (code !== 1005 && (code < 1000 || code > 4999 || reserved)) {
        throw new Error(`the native layer would drop close code ${code}`);
      }
      closedSockets.push({ socketId, code, reason });
    },
  };
});

afterEach(() => {
  globalThis.__workletsNetworking = undefined;
});

function lastSocket(): OpenedSocket {
  return openedSockets[openedSockets.length - 1];
}

function connected(url = 'ws://example.com/socket'): WebSocket {
  const socket = new WebSocket(url);
  lastSocket().emit('open', { protocol: '' });
  return socket;
}

describe('WebSocket construction', () => {
  it('passes ws and wss URLs through', () => {
    new WebSocket('ws://example.com/a');
    expect(lastSocket().config.url).toBe('ws://example.com/a');
    new WebSocket('wss://example.com/b');
    expect(lastSocket().config.url).toBe('wss://example.com/b');
  });

  it('upgrades http and https URLs to ws and wss', () => {
    new WebSocket('http://example.com/a');
    expect(lastSocket().config.url).toBe('ws://example.com/a');
    new WebSocket('https://example.com/b');
    expect(lastSocket().config.url).toBe('wss://example.com/b');
  });

  it('rejects every other scheme', () => {
    expect(() => new WebSocket('ftp://example.com')).toThrow(
      'only ws and wss URLs are supported'
    );
    expect(() => new WebSocket('/relative')).toThrow(
      'only ws and wss URLs are supported'
    );
    expect(openedSockets).toHaveLength(0);
  });

  it('forwards subprotocols as an array', () => {
    new WebSocket('ws://example.com', 'chat');
    expect(lastSocket().config.protocols).toEqual(['chat']);
    new WebSocket('ws://example.com', ['chat', 'superchat']);
    expect(lastSocket().config.protocols).toEqual(['chat', 'superchat']);
  });

  it('rejects malformed and repeated subprotocols', () => {
    expect(() => new WebSocket('ws://example.com', 'bad protocol')).toThrow(
      'is not a valid subprotocol'
    );
    expect(() => new WebSocket('ws://example.com', '')).toThrow(
      'is not a valid subprotocol'
    );
    expect(() => new WebSocket('ws://example.com', ['chat', 'CHAT'])).toThrow(
      'is repeated'
    );
    expect(openedSockets).toHaveLength(0);
  });

  it('starts in the CONNECTING state', () => {
    const socket = new WebSocket('ws://example.com');
    expect(socket.readyState).toBe(WebSocket.CONNECTING);
    expect(socket.readyState).toBe(0);
  });
});

describe('WebSocket lifecycle', () => {
  it('moves to OPEN and reports the negotiated protocol', () => {
    const socket = new WebSocket('ws://example.com', 'chat');
    const seen: string[] = [];
    socket.onopen = () => seen.push('open');
    lastSocket().emit('open', { protocol: 'chat' });

    expect(socket.readyState).toBe(WebSocket.OPEN);
    expect(socket.protocol).toBe('chat');
    expect(seen).toEqual(['open']);
  });

  it('moves to CLOSED and reports the close details', () => {
    const socket = connected();
    let received: { code?: number; reason?: string; wasClean?: boolean } = {};
    socket.onclose = (event) => {
      received = event as typeof received;
    };
    lastSocket().emit('close', { code: 1001, reason: 'bye', wasClean: true });

    expect(socket.readyState).toBe(WebSocket.CLOSED);
    expect(received.code).toBe(1001);
    expect(received.reason).toBe('bye');
    expect(received.wasClean).toBe(true);
  });

  it('reports an abnormal close as not clean', () => {
    const socket = connected();
    let wasClean: boolean | undefined;
    socket.onclose = (event) => {
      wasClean = (event as { wasClean: boolean }).wasClean;
    };
    lastSocket().emit('close', { code: 1006, reason: '', wasClean: false });

    expect(socket.readyState).toBe(WebSocket.CLOSED);
    expect(wasClean).toBe(false);
  });

  it('delivers an error to both handler styles', () => {
    const socket = connected();
    const seen: string[] = [];
    socket.onerror = () => seen.push('handler');
    socket.addEventListener('error', () => seen.push('listener'));
    lastSocket().emit('error', { message: 'boom' });

    expect(seen).toEqual(['handler', 'listener']);
  });
});

describe('WebSocket messages', () => {
  it('delivers a text message as a string', () => {
    const socket = connected();
    let data: unknown;
    socket.onmessage = (event) => {
      data = (event as { data: unknown }).data;
    };
    lastSocket().emit('message', { text: 'hello' });

    expect(data).toBe('hello');
  });

  it('delivers a binary message as a Blob by default', () => {
    const socket = connected();
    let data: unknown;
    socket.onmessage = (event) => {
      data = (event as { data: unknown }).data;
    };
    lastSocket().emit('message', { binary: toArrayBuffer(utf8Encode('hi')) });

    expect(socket.binaryType).toBe('blob');
    expect(data).toBeInstanceOf(Blob);
    expect(utf8Decode((data as Blob).__getBytes())).toBe('hi');
  });

  it('delivers a binary message as an ArrayBuffer when asked to', () => {
    const socket = connected();
    socket.binaryType = 'arraybuffer';
    let data: unknown;
    socket.onmessage = (event) => {
      data = (event as { data: unknown }).data;
    };
    lastSocket().emit('message', { binary: toArrayBuffer(utf8Encode('hi')) });

    expect(data).toBeInstanceOf(ArrayBuffer);
    expect(utf8Decode(new Uint8Array(data as ArrayBuffer))).toBe('hi');
  });

  it('ignores a message that arrives before the open', () => {
    const socket = new WebSocket('ws://example.com');
    const seen: unknown[] = [];
    socket.onmessage = (event) => seen.push(event);
    lastSocket().emit('message', { text: 'early' });

    expect(seen).toHaveLength(0);
    expect(socket.readyState).toBe(WebSocket.CONNECTING);
  });

  it('ignores messages that arrive after the close', () => {
    const socket = connected();
    const seen: unknown[] = [];
    socket.onmessage = (event) => seen.push(event);
    lastSocket().emit('close', { code: 1000, reason: '', wasClean: true });
    lastSocket().emit('message', { text: 'late' });

    expect(seen).toHaveLength(0);
  });
});

describe('WebSocket send', () => {
  it('throws while still connecting', () => {
    const socket = new WebSocket('ws://example.com');
    expect(() => socket.send('nope')).toThrow('still in CONNECTING state');
    expect(sentMessages).toHaveLength(0);
  });

  it('forwards text and counts it towards bufferedAmount', () => {
    const socket = connected();
    socket.send('héllo');

    expect(sentMessages).toEqual([
      { socketId: lastSocket().socketId, message: 'héllo' },
    ]);
    expect(socket.bufferedAmount).toBe(6);
  });

  it('forwards an ArrayBuffer unchanged', () => {
    const socket = connected();
    const buffer = toArrayBuffer(utf8Encode('bytes'));
    socket.send(buffer);

    expect(sentMessages[0].message).toBe(buffer);
    expect(socket.bufferedAmount).toBe(5);
  });

  it('forwards only the view of a typed array', () => {
    const socket = connected();
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6]);
    socket.send(new Uint8Array(bytes.buffer, 2, 3));

    const sent = sentMessages[0].message as ArrayBuffer;
    expect(sent).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(sent))).toEqual([3, 4, 5]);
  });

  it('sends nothing once closed but still counts the bytes', () => {
    const socket = connected();
    lastSocket().emit('close', { code: 1000, reason: '', wasClean: true });
    socket.send('late');

    expect(sentMessages).toHaveLength(0);
    // The spec forbids bufferedAmount from ever decreasing.
    expect(socket.bufferedAmount).toBe(4);
  });

  it('sends nothing while closing but still counts the bytes', () => {
    const socket = connected();
    socket.close(1000);
    socket.send('late');

    expect(sentMessages).toHaveLength(0);
    expect(socket.bufferedAmount).toBe(4);
  });

  it('accepts a Blob', () => {
    const socket = connected();
    socket.send(new Blob(['blobbed']));

    const sent = sentMessages[0].message as ArrayBuffer;
    expect(utf8Decode(new Uint8Array(sent))).toBe('blobbed');
  });
});

describe('WebSocket close', () => {
  it('forwards the code and reason and enters CLOSING', () => {
    const socket = connected();
    socket.close(3000, 'done');

    expect(socket.readyState).toBe(WebSocket.CLOSING);
    expect(closedSockets).toEqual([
      { socketId: lastSocket().socketId, code: 3000, reason: 'done' },
    ]);
  });

  it('defaults to the no-status code', () => {
    const socket = connected();
    socket.close();

    expect(closedSockets[0].code).toBe(1005);
    expect(closedSockets[0].reason).toBe('');
  });

  it('rejects codes outside 1000 and 3000-4999', () => {
    const socket = connected();
    expect(() => socket.close(1001)).toThrow('must be 1000 or between 3000');
    expect(() => socket.close(2999)).toThrow('must be 1000 or between 3000');
    expect(() => socket.close(5000)).toThrow('must be 1000 or between 3000');
    expect(closedSockets).toHaveLength(0);
  });

  it('rejects a reason longer than 123 bytes', () => {
    const socket = connected();
    expect(() => socket.close(1000, 'é'.repeat(62))).toThrow(
      'must not be longer than 123 bytes'
    );
    expect(closedSockets).toHaveLength(0);
  });

  it('ignores a second close', () => {
    const socket = connected();
    socket.close(1000);
    socket.close(1000);

    expect(closedSockets).toHaveLength(1);
  });
});

describe('WebSocket error types', () => {
  function nameOf(run: () => void): string {
    try {
      run();
    } catch (error) {
      return (error as { name: string }).name;
    }
    throw new Error('expected a throw');
  }

  it('throws DOMExceptions with the names the spec mandates', () => {
    expect(nameOf(() => new WebSocket('ftp://example.com'))).toBe(
      'SyntaxError'
    );
    expect(nameOf(() => new WebSocket('ws://example.com/a#frag'))).toBe(
      'SyntaxError'
    );
    expect(nameOf(() => new WebSocket('ws://example.com', 'bad protocol'))).toBe(
      'SyntaxError'
    );
    expect(nameOf(() => new WebSocket('ws://example.com').send('x'))).toBe(
      'InvalidStateError'
    );
    expect(nameOf(() => connected().close(1001))).toBe('InvalidAccessError');
    expect(nameOf(() => connected().close(1000, 'é'.repeat(62)))).toBe(
      'SyntaxError'
    );
  });
});

describe('WebSocket state guards', () => {
  it('rejects a non-integer or NaN close code instead of wedging', () => {
    const socket = connected();
    expect(() => socket.close(Number.NaN)).toThrow();
    expect(() => socket.close(3000.5)).toThrow();

    expect(socket.readyState).toBe(WebSocket.OPEN);
    expect(closedSockets).toHaveLength(0);
  });

  it('does not let a late open resurrect a closed socket', () => {
    const socket = connected();
    lastSocket().emit('close', { code: 1000, reason: '', wasClean: true });
    expect(socket.readyState).toBe(WebSocket.CLOSED);

    lastSocket().emit('open', { protocol: '' });
    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });

  it('exposes the ready-state constants on the instance too', () => {
    const socket = new WebSocket('ws://example.com');
    expect([
      socket.CONNECTING,
      socket.OPEN,
      socket.CLOSING,
      socket.CLOSED,
    ]).toEqual([0, 1, 2, 3]);
  });
});

describe('WebSocket event semantics', () => {
  it('runs listeners in registration order, handler included', () => {
    const socket = new WebSocket('ws://example.com');
    const order: string[] = [];
    socket.addEventListener('open', () => order.push('first'));
    socket.onopen = () => order.push('handler');
    socket.addEventListener('open', () => order.push('last'));
    lastSocket().emit('open', { protocol: '' });

    expect(order).toEqual(['first', 'handler', 'last']);
  });

  it('honours the once option', () => {
    const socket = connected();
    let calls = 0;
    socket.addEventListener('message', () => calls++, { once: true });
    lastSocket().emit('message', { text: 'a' });
    lastSocket().emit('message', { text: 'b' });

    expect(calls).toBe(1);
  });

  it('removes a listener when its signal aborts', () => {
    const socket = connected();
    const controller = new AbortController();
    let calls = 0;
    socket.addEventListener('message', () => calls++, {
      signal: controller.signal,
    });
    lastSocket().emit('message', { text: 'a' });
    controller.abort();
    lastSocket().emit('message', { text: 'b' });

    expect(calls).toBe(1);
  });

  it('removes a listener explicitly', () => {
    const socket = connected();
    let calls = 0;
    const listener = () => calls++;
    socket.addEventListener('message', listener);
    lastSocket().emit('message', { text: 'a' });
    socket.removeEventListener('message', listener);
    lastSocket().emit('message', { text: 'b' });

    expect(calls).toBe(1);
  });

  it('clears the handler when set to null', () => {
    const socket = connected();
    let calls = 0;
    socket.onmessage = () => calls++;
    lastSocket().emit('message', { text: 'a' });
    socket.onmessage = null;
    lastSocket().emit('message', { text: 'b' });

    expect(calls).toBe(1);
  });

  it('gives a message event an origin and a lastEventId', () => {
    const socket = connected('wss://example.com:443/chat');
    let event: { origin?: string; lastEventId?: string } = {};
    socket.onmessage = (received) => {
      event = received as typeof event;
    };
    lastSocket().emit('message', { text: 'a' });

    expect(event.origin).toBe('wss://example.com');
    expect(event.lastEventId).toBe('');
  });
});

describe('WebSocket url and protocol negotiation', () => {
  it('canonicalizes the url', () => {
    expect(new WebSocket('ws://EXAMPLE.com').url).toBe('ws://example.com/');
    expect(new WebSocket('ws://example.com:80/x').url).toBe(
      'ws://example.com/x'
    );
    expect(new WebSocket('wss://example.com:443/x').url).toBe(
      'wss://example.com/x'
    );
    expect(new WebSocket('ws://example.com:8080/x').url).toBe(
      'ws://example.com:8080/x'
    );
  });

  it('rejects a url with no host', () => {
    expect(() => new WebSocket('ws:///x')).toThrow('has no host');
  });

  it('reports the negotiated extensions', () => {
    const socket = new WebSocket('ws://example.com');
    lastSocket().emit('open', {
      protocol: '',
      extensions: 'permessage-deflate',
    });

    expect(socket.extensions).toBe('permessage-deflate');
  });

  it('fails the connection when the server picks an unrequested subprotocol', () => {
    const socket = new WebSocket('ws://example.com', 'chat');
    const order: string[] = [];
    socket.onopen = () => order.push('open');
    socket.onerror = () => order.push('error');
    socket.onclose = () => order.push('close');
    lastSocket().emit('open', { protocol: 'other' });

    expect(order).toEqual(['error', 'close']);
    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });

  it('accepts a subprotocol that was requested', () => {
    const socket = new WebSocket('ws://example.com', ['chat', 'superchat']);
    lastSocket().emit('open', { protocol: 'superchat' });

    expect(socket.readyState).toBe(WebSocket.OPEN);
    expect(socket.protocol).toBe('superchat');
  });
});

describe('WebSocket bufferedAmount', () => {
  it('drains as the platform reports frames written', () => {
    const socket = connected();
    socket.send('12345');
    expect(socket.bufferedAmount).toBe(5);

    lastSocket().emit('flushed', { bytes: 5 });
    expect(socket.bufferedAmount).toBe(0);
  });

  it('never goes negative', () => {
    const socket = connected();
    socket.send('ab');
    lastSocket().emit('flushed', { bytes: 99 });

    expect(socket.bufferedAmount).toBe(0);
  });
});

describe('WebSocket regressions', () => {
  it('keeps a query string out of the authority and preserves its case', () => {
    expect(new WebSocket('ws://example.com?token=AbC123').url).toBe(
      'ws://example.com/?token=AbC123'
    );
    expect(new WebSocket('wss://Example.com?a=1&b=2').url).toBe(
      'wss://example.com/?a=1&b=2'
    );
    expect(new WebSocket('ws://EXAMPLE.com/PaTh?Q=UP').url).toBe(
      'ws://example.com/PaTh?Q=UP'
    );
  });

  it('strips a zero-padded default port but keeps a real one', () => {
    expect(new WebSocket('ws://example.com:080/x').url).toBe(
      'ws://example.com/x'
    );
    expect(new WebSocket('ws://example.com:8080/x').url).toBe(
      'ws://example.com:8080/x'
    );
  });

  it('keeps userinfo case and leaves it out of the origin', () => {
    const socket = connected('ws://User:PaSs@example.com/x');
    expect(socket.url).toBe('ws://User:PaSs@example.com/x');
    let origin: string | undefined;
    socket.onmessage = (event) => {
      origin = (event as { origin: string }).origin;
    };
    lastSocket().emit('message', { text: 'a' });
    expect(origin).toBe('ws://example.com');
  });

  it('fails the connection when the server acknowledges no subprotocol', () => {
    const socket = new WebSocket('ws://example.com', ['chat']);
    const order: string[] = [];
    socket.onopen = () => order.push('open');
    socket.onerror = () => order.push('error');
    socket.onclose = () => order.push('close');
    lastSocket().emit('open', { protocol: '' });

    expect(order).toEqual(['error', 'close']);
    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });

  it('opens normally when no subprotocol was requested', () => {
    const socket = new WebSocket('ws://example.com');
    lastSocket().emit('open', { protocol: '' });
    expect(socket.readyState).toBe(WebSocket.OPEN);
  });

  it('dispatches close exactly once after a failed connection', () => {
    const socket = new WebSocket('ws://example.com', ['chat']);
    let closes = 0;
    socket.onclose = () => closes++;
    lastSocket().emit('open', { protocol: 'other' });
    lastSocket().emit('close', { code: 1006, reason: '', wasClean: false });

    expect(closes).toBe(1);
    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });

  it('dispatches close exactly once on a duplicate native close', () => {
    const socket = connected();
    let closes = 0;
    socket.onclose = () => closes++;
    lastSocket().emit('close', { code: 1000, reason: '', wasClean: true });
    lastSocket().emit('close', { code: 1000, reason: '', wasClean: true });

    expect(closes).toBe(1);
  });

  it('rejects a message that is not a string, BufferSource or Blob', () => {
    const socket = connected();
    expect(() => socket.send(42 as never)).toThrow(TypeError);
    expect(socket.bufferedAmount).toBe(0);
    expect(Number.isNaN(socket.bufferedAmount)).toBe(false);
  });

  it('accepts the close boundaries it documents', () => {
    const atLimit = connected();
    expect(() => atLimit.close(4999)).not.toThrow();

    const reasonAtLimit = connected();
    expect(() =>
      reasonAtLimit.close(1000, `${'é'.repeat(61)}a`)
    ).not.toThrow();
  });
});
