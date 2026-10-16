import { toArrayBuffer } from '../src/networking/bytes';
import { utf8Decode, utf8Encode } from '../src/networking/utf8';
import { XMLHttpRequest } from '../src/networking/XMLHttpRequest';

type SentRequest = {
  requestId: number;
  config: {
    method: string;
    url: string;
    headers: Array<[string, string]>;
    body?: string | ArrayBuffer;
    timeoutMs: number;
    withCredentials: boolean;
  };
  emit: (type: string, payload: unknown) => void;
};

const sentRequests: SentRequest[] = [];
const abortedRequestIds: number[] = [];
let nextRequestId = 1;

beforeEach(() => {
  sentRequests.length = 0;
  abortedRequestIds.length = 0;
  nextRequestId = 1;
  globalThis.__workletsNetworking = {
    sendRequest(config, onEvent) {
      const requestId = nextRequestId++;
      sentRequests.push({ requestId, config, emit: onEvent });
      return requestId;
    },
    abortRequest(requestId) {
      abortedRequestIds.push(requestId);
    },
    decodeText(buffer, encoding) {
      if (encoding !== undefined && /^(iso-8859-1|latin1)$/i.test(encoding)) {
        return Array.from(new Uint8Array(buffer))
          .map((byte) => String.fromCharCode(byte))
          .join('');
      }
      return utf8Decode(new Uint8Array(buffer));
    },
  };
});

afterEach(() => {
  globalThis.__workletsNetworking = undefined;
});

function lastRequest(): SentRequest {
  return sentRequests[sentRequests.length - 1];
}

function bodyOf(value: string): ArrayBuffer {
  return toArrayBuffer(utf8Encode(value));
}

function record(xhr: XMLHttpRequest): string[] {
  const events: string[] = [];
  for (const type of [
    'readystatechange',
    'loadstart',
    'progress',
    'load',
    'error',
    'timeout',
    'abort',
    'loadend',
  ]) {
    xhr.addEventListener(type, () =>
      events.push(
        type === 'readystatechange'
          ? `readystatechange:${xhr.readyState}`
          : type
      )
    );
  }
  return events;
}

function recordUpload(xhr: XMLHttpRequest): string[] {
  const events: string[] = [];
  for (const type of [
    'loadstart',
    'progress',
    'load',
    'error',
    'timeout',
    'abort',
    'loadend',
  ]) {
    xhr.upload.addEventListener(type, () => events.push(type));
  }
  return events;
}

function respond(
  request: SentRequest,
  {
    status = 200,
    statusText = 'OK',
    headers = [['Content-Type', 'text/plain; charset=utf-8']] as Array<
      [string, string]
    >,
    url = 'https://example.com/',
  } = {}
) {
  request.emit('response', { status, statusText, headers, url });
}

describe('XMLHttpRequest.open', () => {
  test('rejects forbidden methods', () => {
    const xhr = new XMLHttpRequest();
    for (const method of ['TRACE', 'trace', 'TRACK', 'CONNECT']) {
      expect(() => xhr.open(method, 'https://example.com/')).toThrow(
        'HTTP method is unsupported'
      );
    }
  });

  test('rejects methods that are not tokens', () => {
    const xhr = new XMLHttpRequest();
    expect(() => xhr.open('GET\r\nX: y', 'https://example.com/')).toThrow(
      'not a valid HTTP method'
    );
  });

  test('rejects an empty URL', () => {
    const xhr = new XMLHttpRequest();
    expect(() => xhr.open('GET', '')).toThrow('URL cannot be empty');
  });

  test('fails an unsupported scheme at send, not at open', async () => {
    for (const url of ['file:///etc/passwd', 'data:,x', 'ftp://a/b', '/rel']) {
      const xhr = new XMLHttpRequest();
      expect(() => xhr.open('GET', url)).not.toThrow();
      const events = record(xhr);
      xhr.send();
      expect(sentRequests).toHaveLength(0);
      await new Promise((resolve) => setTimeout(resolve));
      expect(events).toEqual([
        'loadstart',
        'readystatechange:4',
        'error',
        'loadend',
      ]);
      expect(xhr.status).toBe(0);
    }
  });

  test('normalizes only the known methods', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('post', 'https://example.com/');
    xhr.send('x');
    expect(lastRequest().config.method).toBe('POST');

    const patch = new XMLHttpRequest();
    patch.open('patch', 'https://example.com/');
    patch.send('x');
    expect(lastRequest().config.method).toBe('patch');
  });

  test('does not fire readystatechange when already opened', () => {
    const xhr = new XMLHttpRequest();
    let changes = 0;
    xhr.onreadystatechange = () => changes++;
    xhr.open('GET', 'https://example.com/');
    xhr.open('GET', 'https://example.com/other');
    expect(changes).toBe(1);
  });

  test('aborts an in-flight request without firing abort events', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const events = record(xhr);
    xhr.open('GET', 'https://example.com/other');
    expect(abortedRequestIds).toEqual([1]);
    expect(events).toEqual([]);
  });

  test('rejects synchronous requests', () => {
    const xhr = new XMLHttpRequest();
    expect(() => xhr.open('GET', 'https://example.com/', false)).toThrow(
      'Synchronous XMLHttpRequest is not supported'
    );
  });
});

describe('XMLHttpRequest.setRequestHeader', () => {
  test('combines duplicates with a comma and space', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.setRequestHeader('X-Test', 'one');
    xhr.setRequestHeader('x-test', 'two');
    xhr.send();
    expect(lastRequest().config.headers).toEqual([['X-Test', 'one, two']]);
  });

  test('drops forbidden request headers', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    for (const name of [
      'Cookie',
      'Host',
      'Content-Length',
      'Connection',
      'Sec-Fetch-Mode',
      'Proxy-Authorization',
    ]) {
      xhr.setRequestHeader(name, 'value');
    }
    xhr.send();
    expect(lastRequest().config.headers).toEqual([]);
  });

  test('rejects header names and values that break framing', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    expect(() => xhr.setRequestHeader('X-A', 'a\r\nX-Injected: b')).toThrow(
      'is not a valid header'
    );
    expect(() => xhr.setRequestHeader('X-A', 'a\0b')).toThrow(
      'is not a valid header'
    );
    expect(() => xhr.setRequestHeader('X A', 'b')).toThrow(
      'is not a valid header'
    );
  });

  test('trims surrounding HTTP whitespace from the value', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.setRequestHeader('X-Test', '  value\t');
    xhr.send();
    expect(lastRequest().config.headers).toEqual([['X-Test', 'value']]);
  });
});

describe('XMLHttpRequest response headers', () => {
  test('sorts, lowercases and combines, and hides set-cookie', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    respond(lastRequest(), {
      headers: [
        ['X-Dup', 'one'],
        ['Content-Type', 'text/plain'],
        ['Set-Cookie', 'a=1'],
        ['x-dup', 'two'],
      ],
    });
    expect(xhr.getAllResponseHeaders()).toBe(
      'content-type: text/plain\r\nx-dup: one, two\r\n'
    );
    expect(xhr.getResponseHeader('X-DUP')).toBe('one, two');
    expect(xhr.getResponseHeader('set-cookie')).toBe(null);
  });
});

describe('XMLHttpRequest terminal sequences', () => {
  test('fires the success sequence in spec order', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    const events = record(xhr);
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('downloadProgress', { loaded: 2, total: 5 });
    request.emit('done', { body: bodyOf('hello') });

    expect(events).toEqual([
      'loadstart',
      'readystatechange:2',
      'readystatechange:3',
      'progress',
      'progress',
      'readystatechange:4',
      'load',
      'loadend',
    ]);
    expect(xhr.responseText).toBe('hello');
    expect(xhr.status).toBe(200);
  });

  test('fires load with the transmitted and total byte counts', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    let loadEvent: { loaded: number; total: number; lengthComputable: boolean };
    xhr.onload = (event) => {
      loadEvent = event;
    };
    xhr.send();
    const request = lastRequest();
    respond(request, {
      headers: [
        ['Content-Type', 'text/plain'],
        ['Content-Length', '5'],
      ],
    });
    request.emit('done', { body: bodyOf('hello') });
    expect(loadEvent!).toMatchObject({
      loaded: 5,
      total: 5,
      lengthComputable: true,
    });
  });

  test('resets the response on a network error', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    const events = record(xhr);
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('done', { error: 'network', message: 'boom' });

    expect(events).toEqual([
      'loadstart',
      'readystatechange:2',
      'readystatechange:4',
      'error',
      'loadend',
    ]);
    expect(xhr.status).toBe(0);
    expect(xhr.statusText).toBe('');
    expect(xhr.responseURL).toBe('');
    expect(xhr.getAllResponseHeaders()).toBe('');
    expect(xhr.responseText).toBe('');
  });

  test('resets the response on a timeout', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    const events = record(xhr);
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('done', { error: 'timeout' });

    expect(events).toEqual([
      'loadstart',
      'readystatechange:2',
      'readystatechange:4',
      'timeout',
      'loadend',
    ]);
    expect(xhr.status).toBe(0);
  });

  test('reports a missing response as an error, not a load', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    const events = record(xhr);
    xhr.send();
    lastRequest().emit('done', {});
    expect(events).toContain('error');
    expect(events).not.toContain('load');
  });

  test('treats a 404 as a successful load', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    const events = record(xhr);
    xhr.send();
    const request = lastRequest();
    respond(request, { status: 404, statusText: 'Not Found' });
    request.emit('done', { body: bodyOf('missing') });
    expect(events).toContain('load');
    expect(events).not.toContain('error');
    expect(xhr.status).toBe(404);
    expect(xhr.responseText).toBe('missing');
  });

  test('accepts an empty 204 body', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request, { status: 204, statusText: 'No Content', headers: [] });
    request.emit('done', {});
    expect(xhr.status).toBe(204);
    expect(xhr.responseText).toBe('');
  });
});

describe('XMLHttpRequest.abort', () => {
  test('is a no-op before send', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    const events = record(xhr);
    xhr.abort();
    expect(events).toEqual([]);
    expect(abortedRequestIds).toEqual([]);
  });

  test('fires abort and loadend, then returns to UNSENT', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    const events = record(xhr);
    const readyStatesDuringAbort: number[] = [];
    xhr.onabort = () => readyStatesDuringAbort.push(xhr.readyState);
    xhr.send();
    respond(lastRequest());
    xhr.abort();

    expect(events).toEqual([
      'loadstart',
      'readystatechange:2',
      'readystatechange:4',
      'abort',
      'loadend',
    ]);
    expect(readyStatesDuringAbort).toEqual([XMLHttpRequest.DONE]);
    expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT);
    expect(abortedRequestIds).toEqual([1]);
  });

  test('resets readyState to UNSENT when called after DONE', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('done', { body: bodyOf('hi') });
    expect(xhr.readyState).toBe(XMLHttpRequest.DONE);
    xhr.abort();
    expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT);
  });

  test('drops native events that arrive after an abort', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request);
    xhr.abort();
    const events = record(xhr);
    request.emit('done', { body: bodyOf('late') });
    expect(events).toEqual([]);
  });

  test('lets a loadend handler reopen the request', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.onloadend = () => {
      if (xhr.readyState !== XMLHttpRequest.OPENED) {
        xhr.open('GET', 'https://example.com/again');
      }
    };
    xhr.send();
    respond(lastRequest());
    xhr.abort();
    expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);
    expect(() => xhr.send()).not.toThrow();
  });
  test('does not fire the unsupported-scheme error after an abort', async () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/rel');
    const events = record(xhr);
    xhr.send();
    xhr.abort();
    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual([
      'loadstart',
      'readystatechange:4',
      'abort',
      'loadend',
    ]);
    expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT);
  });
});

describe('XMLHttpRequest upload', () => {
  test('fires progress, load and loadend with the body length', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://example.com/');
    const uploadEvents = recordUpload(xhr);
    xhr.send('hello');
    const request = lastRequest();
    respond(request);
    request.emit('done', { body: bodyOf('ok') });
    expect(uploadEvents).toEqual(['loadstart', 'progress', 'load', 'loadend']);
  });

  test('fires the terminal upload event after the XHR reaches DONE', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://example.com/');
    let readyStateOnUploadAbort = -1;
    xhr.upload.onabort = () => {
      readyStateOnUploadAbort = xhr.readyState;
    };
    xhr.send('hello');
    xhr.abort();
    expect(readyStateOnUploadAbort).toBe(XMLHttpRequest.DONE);
  });

  test('does not touch the upload object without a request body', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    const uploadEvents = recordUpload(xhr);
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('done', { body: bodyOf('ok') });
    expect(uploadEvents).toEqual([]);
  });
});

describe('XMLHttpRequest request bodies', () => {
  test('suppresses bodies on GET and HEAD', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send('ignored');
    expect(lastRequest().config.body).toBeUndefined();
  });

  test('sends a string with a default content type', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://example.com/');
    xhr.send('body');
    expect(lastRequest().config.body).toBe('body');
    expect(lastRequest().config.headers).toEqual([
      ['Content-Type', 'text/plain;charset=UTF-8'],
    ]);
  });

  test('keeps an author-set content type', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://example.com/');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send('{}');
    expect(lastRequest().config.headers).toEqual([
      ['Content-Type', 'application/json'],
    ]);
  });

  test('sends only the view of a typed array, not its whole buffer', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5, 6]).buffer;
    const view = new Uint8Array(buffer, 2, 3);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://example.com/');
    xhr.send(view);
    const body = lastRequest().config.body as ArrayBuffer;
    expect(Array.from(new Uint8Array(body))).toEqual([3, 4, 5]);
  });
});

describe('XMLHttpRequest response decoding', () => {
  test('decodes the body with the response charset', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request, {
      headers: [['Content-Type', 'text/plain; charset=iso-8859-1']],
    });
    request.emit('done', { body: toArrayBuffer(new Uint8Array([0xe9])) });
    expect(xhr.responseText).toBe('é');
  });

  test('replaces invalid UTF-8 rather than corrupting it', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('done', {
      body: toArrayBuffer(new Uint8Array([0x61, 0xff, 0x62])),
    });
    expect(xhr.responseText).toBe('a�b');
  });

  test('honours overrideMimeType', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.overrideMimeType('text/plain; charset=iso-8859-1');
    xhr.send();
    const request = lastRequest();
    respond(request, {
      headers: [['Content-Type', 'text/plain; charset=utf-8']],
    });
    request.emit('done', { body: toArrayBuffer(new Uint8Array([0xe9])) });
    expect(xhr.responseText).toBe('é');
  });

  test('throws from overrideMimeType once loading has started', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('downloadProgress', { loaded: 1, total: 1 });
    expect(() => xhr.overrideMimeType('text/plain')).toThrow(
      'cannot be overridden'
    );
  });

  test('exposes arraybuffer and json response types', () => {
    const arrayBufferXhr = new XMLHttpRequest();
    arrayBufferXhr.responseType = 'arraybuffer';
    arrayBufferXhr.open('GET', 'https://example.com/');
    arrayBufferXhr.send();
    expect(arrayBufferXhr.response).toBe(null);
    const arrayBufferRequest = lastRequest();
    respond(arrayBufferRequest);
    arrayBufferRequest.emit('done', { body: bodyOf('ab') });
    expect(
      Array.from(new Uint8Array(arrayBufferXhr.response as ArrayBuffer))
    ).toEqual([0x61, 0x62]);

    const jsonXhr = new XMLHttpRequest();
    jsonXhr.responseType = 'json';
    jsonXhr.open('GET', 'https://example.com/');
    jsonXhr.send();
    const jsonRequest = lastRequest();
    respond(jsonRequest);
    jsonRequest.emit('done', { body: bodyOf('{"a":1}') });
    expect(jsonXhr.response).toEqual({ a: 1 });

    const brokenJsonXhr = new XMLHttpRequest();
    brokenJsonXhr.responseType = 'json';
    brokenJsonXhr.open('GET', 'https://example.com/');
    brokenJsonXhr.send();
    const brokenJsonRequest = lastRequest();
    respond(brokenJsonRequest);
    brokenJsonRequest.emit('done', { body: bodyOf('not json') });
    expect(brokenJsonXhr.response).toBe(null);
  });

  test('ignores an out-of-enum responseType', () => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'document' as never;
    expect(xhr.responseType).toBe('');
  });

  test('throws when reading responseText for a binary responseType', () => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    expect(() => xhr.responseText).toThrow('only accessible');
  });

  test('rejects a responseType change once loading has started', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('downloadProgress', { loaded: 1, total: 1 });
    expect(() => {
      xhr.responseType = 'arraybuffer';
    }).toThrow('cannot be changed');
  });
});

describe('XMLHttpRequest errors', () => {
  test('throws DOMExceptions with the spec names', () => {
    const xhr = new XMLHttpRequest();
    expect(() => xhr.setRequestHeader('X', 'y')).toThrow(
      expect.objectContaining({ name: 'InvalidStateError' })
    );
    expect(() => xhr.open('TRACE', 'https://example.com/')).toThrow(
      expect.objectContaining({ name: 'SecurityError' })
    );
    expect(() => xhr.open('GET', '')).toThrow(
      expect.objectContaining({ name: 'SyntaxError' })
    );
    expect(() => xhr.open('GET', 'https://example.com/', false)).toThrow(
      expect.objectContaining({ name: 'InvalidAccessError' })
    );
  });

  test('throws when sending twice', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    expect(() => xhr.send()).toThrow("the object's state must be OPENED");
  });
});

describe('XMLHttpRequest concurrency', () => {
  test('keeps concurrent requests independent', () => {
    const first = new XMLHttpRequest();
    const second = new XMLHttpRequest();
    first.open('GET', 'https://example.com/first');
    second.open('GET', 'https://example.com/second');
    first.send();
    second.send();
    const [firstRequest, secondRequest] = sentRequests;

    respond(secondRequest);
    secondRequest.emit('done', { body: bodyOf('second') });
    respond(firstRequest);
    firstRequest.emit('done', { body: bodyOf('first') });

    expect(first.responseText).toBe('first');
    expect(second.responseText).toBe('second');
  });
});

describe('XMLHttpRequest stale responses', () => {
  test('drops a response that belongs to a superseded request', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/first');
    xhr.send();
    const first = lastRequest();
    respond(first);
    xhr.abort();

    xhr.open('GET', 'https://example.com/second');
    const events = record(xhr);
    xhr.send();
    const second = lastRequest();

    first.emit('response', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: [['X-Stale', 'yes']],
      url: 'https://example.com/first',
    });
    first.emit('done', { body: bodyOf('stale') });

    expect(events).toEqual(['loadstart']);
    expect(xhr.status).toBe(0);
    expect(xhr.getResponseHeader('X-Stale')).toBe(null);

    respond(second);
    second.emit('done', { body: bodyOf('fresh') });
    expect(xhr.responseText).toBe('fresh');
    expect(xhr.status).toBe(200);
  });

  test('drops the error of a superseded unsupported-scheme request', async () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/rel');
    xhr.send();

    xhr.open('GET', 'https://example.com/');
    const events = record(xhr);
    xhr.send();
    const request = lastRequest();
    await new Promise((resolve) => setTimeout(resolve));

    expect(events).toEqual(['loadstart']);
    expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);

    respond(request);
    request.emit('done', { body: bodyOf('fresh') });
    expect(xhr.responseText).toBe('fresh');
    expect(xhr.status).toBe(200);
  });
});

describe('XMLHttpRequest response caching', () => {
  test('does not cache the empty body read during LOADING', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.LOADING) {
        expect(xhr.responseText).toBe('');
      }
    };
    xhr.send();
    const request = lastRequest();
    respond(request);
    request.emit('downloadProgress', { loaded: 2, total: 5 });
    request.emit('done', { body: bodyOf('hello') });
    expect(xhr.responseText).toBe('hello');
  });

  test('clears the response when aborted after DONE', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request, { headers: [['X-A', '1']] });
    request.emit('done', { body: bodyOf('hi') });
    xhr.abort();
    expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT);
    expect(xhr.status).toBe(0);
    expect(xhr.statusText).toBe('');
    expect(xhr.responseURL).toBe('');
    expect(xhr.getAllResponseHeaders()).toBe('');
  });

  test('keeps the request open when aborted before send', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.abort();
    expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);
    expect(() => xhr.send()).not.toThrow();
  });

  test('parses json from UTF-8 regardless of the response charset', () => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    const request = lastRequest();
    respond(request, {
      headers: [['Content-Type', 'application/json; charset=iso-8859-1']],
    });
    request.emit('done', { body: bodyOf('{"t":"café"}') });
    expect(xhr.response).toEqual({ t: 'café' });
  });
});

describe('XMLHttpRequest progress totals', () => {
  test('reports a chunked response as not length-computable', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    let loadEvent: { loaded: number; total: number; lengthComputable: boolean };
    xhr.onload = (event) => {
      loadEvent = event;
    };
    xhr.send();
    const request = lastRequest();
    respond(request, { headers: [['Content-Type', 'text/plain']] });
    request.emit('done', { body: bodyOf('hello') });
    expect(loadEvent!).toMatchObject({
      loaded: 5,
      total: 0,
      lengthComputable: false,
    });
  });

  test('reports a zero-length upload as not length-computable', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://example.com/');
    let event: { loaded: number; total: number; lengthComputable: boolean };
    xhr.upload.onprogress = (progress) => {
      event = progress;
    };
    xhr.send('x');
    lastRequest().emit('uploadProgress', { loaded: 0, total: 0 });
    expect(event!).toMatchObject({
      loaded: 0,
      total: 0,
      lengthComputable: false,
    });
  });

  test('counts the upload body in bytes, not UTF-16 units', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://example.com/');
    const loaded: number[] = [];
    xhr.upload.onprogress = (event) => loaded.push(event.loaded);
    xhr.upload.onload = (event) => loaded.push(event.loaded);
    xhr.send('café');
    const request = lastRequest();
    request.emit('uploadProgress', { loaded: 5, total: 5 });
    respond(request);
    request.emit('done', { body: bodyOf('ok') });
    expect(loaded).toEqual([5, 5, 5]);
  });
});

describe('XMLHttpRequest header policy', () => {
  test('drops method-override headers naming a forbidden method', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.setRequestHeader('X-HTTP-Method-Override', 'TRACE');
    xhr.setRequestHeader('X-Method-Override', 'connect');
    xhr.setRequestHeader('X-HTTP-Method', 'PUT');
    xhr.send();
    expect(lastRequest().config.headers).toEqual([['X-HTTP-Method', 'PUT']]);
  });

  test('sorts response headers by legacy-uppercased byte', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.send();
    respond(lastRequest(), {
      headers: [
        ['a_b', '1'],
        ['aab', '2'],
        ['a-b', '3'],
      ],
    });
    expect(xhr.getAllResponseHeaders()).toBe('a-b: 3\r\naab: 2\r\na_b: 1\r\n');
  });

  test('keeps a form feed in a header value', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    xhr.setRequestHeader('X-Test', ' \fvalue ');
    xhr.send();
    expect(lastRequest().config.headers).toEqual([['X-Test', '\fvalue']]);
  });
});
