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

describe('XMLHttpRequest', () => {
  test('implements the state machine offline', () => {
    const xhr = new XMLHttpRequest();
    expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT);
    expect(xhr.status).toBe(0);
    expect(() => xhr.setRequestHeader('X-Test', 'value')).toThrow('[Worklets]');
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
