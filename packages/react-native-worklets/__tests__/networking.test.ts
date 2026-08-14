import { AbortController } from '../src/networking/AbortController';
import { Blob } from '../src/networking/Blob';
import { FormData } from '../src/networking/FormData';
import { utf8Decode, utf8Encode } from '../src/networking/utf8';
import { XMLHttpRequest } from '../src/networking/XMLHttpRequest';

describe('utf8', () => {
  test('encodes and decodes ASCII', () => {
    const bytes = utf8Encode('plain text');
    expect(utf8Decode(bytes)).toBe('plain text');
  });

  test('encodes and decodes multi-byte characters', () => {
    const value = 'zażółć gęślą jaźń 🦄 汉字';
    expect(utf8Decode(utf8Encode(value))).toBe(value);
  });

  test('encodes multi-byte characters like TextEncoder', () => {
    expect(Array.from(utf8Encode('ż'))).toEqual([0xc5, 0xbc]);
    expect(Array.from(utf8Encode('🦄'))).toEqual([0xf0, 0x9f, 0xa6, 0x84]);
  });

  test('replaces invalid sequences with the replacement character', () => {
    expect(utf8Decode(new Uint8Array([0x61, 0xff, 0x62]))).toBe('a�b');
    expect(utf8Decode(new Uint8Array([0xc5]))).toBe('�');
  });

  test('replaces lone surrogates when encoding', () => {
    expect(Array.from(utf8Encode('\uD800'))).toEqual([0xef, 0xbf, 0xbd]);
    expect(Array.from(utf8Encode('a\uDC00b'))).toEqual([
      0x61, 0xef, 0xbf, 0xbd, 0x62,
    ]);
  });
});

describe('Blob', () => {
  test('concatenates parts and reports size', async () => {
    const blob = new Blob(['abc', new Uint8Array([0x64]).buffer], {
      type: 'Text/Plain',
    });
    expect(blob.size).toBe(4);
    expect(blob.type).toBe('text/plain');
    await expect(blob.text()).resolves.toBe('abcd');
  });

  test('constructs without arguments', () => {
    expect(new Blob().size).toBe(0);
  });

  test('handles non-ASCII text parts', async () => {
    const blob = new Blob(['jaźń']);
    expect(blob.size).toBe(6);
    await expect(blob.text()).resolves.toBe('jaźń');
  });

  test('slices with negative indices', async () => {
    const blob = new Blob(['abcdef']);
    const slice = blob.slice(-3, -1, 'text/x-slice');
    expect(slice.size).toBe(2);
    expect(slice.type).toBe('text/x-slice');
    await expect(slice.text()).resolves.toBe('de');
  });

  test('exposes bytes as an ArrayBuffer', async () => {
    const buffer = await new Blob(['ab']).arrayBuffer();
    expect(Array.from(new Uint8Array(buffer))).toEqual([0x61, 0x62]);
  });

  test('is detectable through Object.prototype.toString', () => {
    expect(Object.prototype.toString.call(new Blob())).toBe('[object Blob]');
  });
});

describe('FormData', () => {
  test('implements the entry API', () => {
    const formData = new FormData();
    formData.append('a', '1');
    formData.append('a', '2');
    formData.append('b', '3');
    expect(formData.get('a')).toBe('1');
    expect(formData.getAll('a')).toEqual(['1', '2']);
    expect(formData.has('b')).toBe(true);
    formData.set('a', '4');
    expect(formData.getAll('a')).toEqual(['4']);
    formData.delete('b');
    expect(formData.has('b')).toBe(false);
    expect([...formData.keys()]).toEqual(['a']);
  });

  test('exposes React Native style parts', () => {
    const formData = new FormData();
    formData.append('field', 'value');
    expect(formData.getParts()).toEqual([
      {
        string: 'value',
        fieldName: 'field',
        headers: { 'content-disposition': 'form-data; name="field"' },
      },
    ]);
  });

  test('encodes multipart bodies', () => {
    const formData = new FormData();
    formData.append('field', 'value');
    formData.append('emoji', '🦄');
    const { body, contentType } = formData.__encodeMultipart();
    const boundary = contentType.replace(
      'multipart/form-data; boundary=',
      ''
    );
    expect(contentType).toBe(`multipart/form-data; boundary=${boundary}`);
    const encoded = utf8Decode(new Uint8Array(body));
    expect(encoded).toBe(
      `--${boundary}\r\ncontent-disposition: form-data; name="field"\r\n\r\nvalue\r\n` +
        `--${boundary}\r\ncontent-disposition: form-data; name="emoji"\r\n\r\n🦄\r\n` +
        `--${boundary}--\r\n`
    );
  });

  test('escapes quotes and newlines in field names', () => {
    const formData = new FormData();
    formData.append('na"me\r\n', 'value');
    const { body } = formData.__encodeMultipart();
    expect(utf8Decode(new Uint8Array(body))).toContain(
      'content-disposition: form-data; name="na%22me%0D%0A"'
    );
  });
});

describe('AbortController', () => {
  test('aborts its signal once', () => {
    const controller = new AbortController();
    const listener = jest.fn();
    const handler = jest.fn();
    controller.signal.addEventListener('abort', listener);
    controller.signal.onabort = handler;
    expect(controller.signal.aborted).toBe(false);
    controller.abort();
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((controller.signal.reason as Error).name).toBe('AbortError');
  });

  test('keeps a custom abort reason', () => {
    const controller = new AbortController();
    const reason = new Error('[Worklets] custom');
    controller.abort(reason);
    expect(controller.signal.reason).toBe(reason);
    expect(() => controller.signal.throwIfAborted()).toThrow(reason);
  });

  test('removes abort listeners', () => {
    const controller = new AbortController();
    const listener = jest.fn();
    controller.signal.addEventListener('abort', listener);
    controller.signal.removeEventListener('abort', listener);
    controller.abort();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('XMLHttpRequest', () => {
  test('implements the state machine offline', () => {
    const xhr = new XMLHttpRequest();
    expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT);
    expect(xhr.status).toBe(0);
    expect(() => xhr.setRequestHeader('X-Test', 'value')).toThrow(
      '[Worklets]'
    );
    const readyStates: number[] = [];
    xhr.onreadystatechange = () => readyStates.push(xhr.readyState);
    xhr.open('GET', 'https://example.com/');
    expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);
    expect(readyStates).toEqual([XMLHttpRequest.OPENED]);
    xhr.setRequestHeader('X-Test', 'value');
    expect(xhr.getAllResponseHeaders()).toBe('');
    expect(xhr.getResponseHeader('content-type')).toBe(null);
  });

  test('throws when sending without the native module', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com/');
    expect(() => xhr.send()).toThrow(
      '[Worklets] XMLHttpRequest is not available on this runtime.'
    );
  });

  test('guards responseText by responseType', () => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    expect(() => xhr.responseText).toThrow('[Worklets]');
    expect(xhr.response).toBe(null);
  });
});
