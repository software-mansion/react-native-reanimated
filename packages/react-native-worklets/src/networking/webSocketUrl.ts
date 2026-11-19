'use strict';

import { utf8Decode, utf8Encode } from './utf8';

type WebSocketUrl = {
  href: string;
  origin: string;
};

export function parseWebSocketUrl(input: string): WebSocketUrl {
  const url = trimC0ControlOrSpace(input).replace(/[\t\n\r]/g, '');
  const schemeMatch = /^([A-Za-z][A-Za-z0-9+\-.]*):/.exec(url);
  const scheme = webSocketScheme(schemeMatch?.[1]?.toLowerCase());
  if (scheme === null) {
    fail(`only ws and wss URLs are supported, got '${input}'`);
  }
  if (url.includes('#')) {
    fail(`the URL must not have a fragment, got '${input}'`);
  }

  const afterScheme = url.slice(schemeMatch![0].length).replace(/^[/\\]+/, '');
  const authorityEnd = afterScheme.search(/[/\\?]/);
  const authority =
    authorityEnd === -1 ? afterScheme : afterScheme.slice(0, authorityEnd);
  const remainder = authorityEnd === -1 ? '' : afterScheme.slice(authorityEnd);

  const userinfoAt = authority.lastIndexOf('@');
  const userinfo = serializeUserinfo(
    userinfoAt === -1 ? '' : authority.slice(0, userinfoAt)
  );
  const hostAndPort = authority.slice(userinfoAt + 1);
  const { rawHost, port } = splitPort(hostAndPort, scheme!);
  const host = parseHost(rawHost);

  const queryStart = remainder.indexOf('?');
  const rawPath =
    queryStart === -1 ? remainder : remainder.slice(0, queryStart);
  const path = serializePath(rawPath);
  const query =
    queryStart === -1
      ? ''
      : `?${percentEncode(remainder.slice(queryStart + 1), isSpecialQueryByte)}`;

  const hostPort = `${host}${port === null ? '' : `:${port}`}`;
  return {
    href: `${scheme}://${userinfo}${hostPort}${path}${query}`,
    origin: `${scheme}://${hostPort}`,
  };
}

function webSocketScheme(scheme: string | undefined): 'ws' | 'wss' | null {
  switch (scheme) {
    case 'ws':
    case 'http':
      return 'ws';
    case 'wss':
    case 'https':
      return 'wss';
    default:
      return null;
  }
}

function fail(message: string): never {
  throw new DOMException(
    `[Worklets] Failed to construct 'WebSocket': ${message}.`,
    'SyntaxError'
  );
}

function serializeUserinfo(userinfo: string): string {
  if (userinfo === '') {
    return '';
  }
  const colon = userinfo.indexOf(':');
  const username = percentEncode(
    colon === -1 ? userinfo : userinfo.slice(0, colon),
    isUserinfoByte
  );
  const password =
    colon === -1
      ? ''
      : percentEncode(userinfo.slice(colon + 1), isUserinfoByte);
  if (username === '' && password === '') {
    return '';
  }
  return password === '' ? `${username}@` : `${username}:${password}@`;
}

function splitPort(
  hostAndPort: string,
  scheme: 'ws' | 'wss'
): { rawHost: string; port: number | null } {
  const colon = hostAndPort.lastIndexOf(':');
  if (colon === -1 || colon < hostAndPort.lastIndexOf(']')) {
    return { rawHost: hostAndPort, port: null };
  }
  const rawPort = hostAndPort.slice(colon + 1);
  const rawHost = hostAndPort.slice(0, colon);
  if (rawPort === '') {
    return { rawHost, port: null };
  }
  if (!/^[0-9]+$/.test(rawPort)) {
    fail('the URL has an invalid port');
  }
  const port = Number(rawPort);
  if (port > 65535) {
    fail('the URL has a port above 65535');
  }
  const defaultPort = scheme === 'wss' ? 443 : 80;
  return { rawHost, port: port === defaultPort ? null : port };
}

function parseHost(rawHost: string): string {
  if (rawHost === '') {
    fail('the URL has no host');
  }
  if (rawHost.startsWith('[')) {
    if (!rawHost.endsWith(']')) {
      fail('the URL has an invalid IPv6 address');
    }
    return `[${serializeIpv6(parseIpv6(rawHost.slice(1, -1)))}]`;
  }
  const domain = domainToAscii(percentDecode(rawHost));
  if (domain === '' || hasForbiddenDomainCodePoint(domain)) {
    fail(`the URL has an invalid host '${rawHost}'`);
  }
  if (endsInANumber(domain)) {
    return serializeIpv4(parseIpv4(domain));
  }
  return domain;
}

function hasForbiddenDomainCodePoint(domain: string): boolean {
  for (const character of domain) {
    const code = character.charCodeAt(0);
    if (
      code <= 0x20 ||
      code === 0x7f ||
      FORBIDDEN_DOMAIN_SYMBOLS.includes(character)
    ) {
      return true;
    }
  }
  return false;
}

const FORBIDDEN_DOMAIN_SYMBOLS = '#%/:<>?@[\\]^|';

function isAscii(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0x7f) {
      return false;
    }
  }
  return true;
}

function trimC0ControlOrSpace(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) <= 0x20) {
    start++;
  }
  while (end > start && value.charCodeAt(end - 1) <= 0x20) {
    end--;
  }
  return value.slice(start, end);
}

function percentDecode(value: string): string {
  if (!value.includes('%')) {
    return value;
  }
  const bytes: number[] = [];
  const encoded = utf8Encode(value);
  for (let i = 0; i < encoded.length; i++) {
    const hex = String.fromCharCode(encoded[i + 1], encoded[i + 2]);
    if (encoded[i] === 0x25 && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(encoded[i]);
    }
  }
  return utf8Decode(new Uint8Array(bytes));
}

function domainToAscii(domain: string): string {
  const lowered = domain.toLowerCase();
  if (isAscii(lowered)) {
    return lowered;
  }
  const normalized =
    typeof lowered.normalize === 'function'
      ? lowered.normalize('NFC')
      : lowered;
  return normalized
    .split(/[.。．｡]/)
    .map((label) => (isAscii(label) ? label : `xn--${punycodeEncode(label)}`))
    .join('.');
}

function punycodeEncode(input: string): string {
  const BASE = 36;
  const T_MIN = 1;
  const T_MAX = 26;
  const codePoints = Array.from(
    input,
    (character) => character.codePointAt(0)!
  );
  let output = codePoints
    .filter((codePoint) => codePoint < 0x80)
    .map((codePoint) => String.fromCharCode(codePoint))
    .join('');
  const basicLength = output.length;
  let handled = basicLength;
  if (basicLength > 0) {
    output += '-';
  }
  let n = 0x80;
  let delta = 0;
  let bias = 72;
  while (handled < codePoints.length) {
    const next = Math.min(...codePoints.filter((codePoint) => codePoint >= n));
    delta += (next - n) * (handled + 1);
    n = next;
    for (const codePoint of codePoints) {
      if (codePoint < n) {
        delta++;
      }
      if (codePoint !== n) {
        continue;
      }
      let q = delta;
      for (let k = BASE; ; k += BASE) {
        const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
        if (q < t) {
          break;
        }
        output += encodeDigit(t + ((q - t) % (BASE - t)));
        q = Math.floor((q - t) / (BASE - t));
      }
      output += encodeDigit(q);
      bias = adaptBias(delta, handled + 1, handled === basicLength);
      delta = 0;
      handled++;
    }
    delta++;
    n++;
  }
  return output;
}

function encodeDigit(digit: number): string {
  return String.fromCharCode(digit < 26 ? digit + 97 : digit + 22);
}

function adaptBias(delta: number, points: number, first: boolean): number {
  let scaled = first ? Math.floor(delta / 700) : Math.floor(delta / 2);
  scaled += Math.floor(scaled / points);
  let k = 0;
  while (scaled > 455) {
    scaled = Math.floor(scaled / 35);
    k += 36;
  }
  return k + Math.floor((36 * scaled) / (scaled + 38));
}

function endsInANumber(domain: string): boolean {
  const parts = domain.split('.');
  if (parts[parts.length - 1] === '' && parts.length > 1) {
    parts.pop();
  }
  const last = parts[parts.length - 1];
  return /^[0-9]+$/.test(last) || /^0[xX][0-9A-Fa-f]*$/.test(last);
}

function parseIpv4(domain: string): number {
  const parts = domain.split('.');
  if (parts[parts.length - 1] === '' && parts.length > 1) {
    parts.pop();
  }
  if (parts.length > 4) {
    fail('the URL has an invalid IPv4 address');
  }
  const numbers = parts.map(parseIpv4Number);
  for (let i = 0; i < numbers.length - 1; i++) {
    if (numbers[i] > 255) {
      fail('the URL has an invalid IPv4 address');
    }
  }
  const last = numbers[numbers.length - 1];
  if (last >= 256 ** (5 - numbers.length)) {
    fail('the URL has an invalid IPv4 address');
  }
  let address = last;
  for (let i = 0; i < numbers.length - 1; i++) {
    address += numbers[i] * 256 ** (3 - i);
  }
  return address;
}

function parseIpv4Number(part: string): number {
  if (part === '') {
    fail('the URL has an invalid IPv4 address');
  }
  let digits = part;
  let radix = 10;
  if (/^0[xX]/.test(digits)) {
    digits = digits.slice(2);
    radix = 16;
  } else if (digits.length > 1 && digits.startsWith('0')) {
    digits = digits.slice(1);
    radix = 8;
  }
  if (digits === '') {
    return 0;
  }
  const pattern =
    radix === 16 ? /^[0-9A-Fa-f]+$/ : radix === 8 ? /^[0-7]+$/ : /^[0-9]+$/;
  if (!pattern.test(digits)) {
    fail('the URL has an invalid IPv4 address');
  }
  return parseInt(digits, radix);
}

function serializeIpv4(address: number): string {
  const octets: number[] = [];
  let remaining = address;
  for (let i = 0; i < 4; i++) {
    octets.unshift(remaining % 256);
    remaining = Math.floor(remaining / 256);
  }
  return octets.join('.');
}

function parseIpv6(input: string): number[] {
  const pieces = [0, 0, 0, 0, 0, 0, 0, 0];
  let pieceIndex = 0;
  let compress: number | null = null;
  let pointer = 0;
  const invalid = (): never => fail('the URL has an invalid IPv6 address');
  if (input[pointer] === ':') {
    if (input[pointer + 1] !== ':') {
      invalid();
    }
    pointer += 2;
    pieceIndex++;
    compress = pieceIndex;
  }
  while (pointer < input.length) {
    if (pieceIndex === 8) {
      invalid();
    }
    if (input[pointer] === ':') {
      if (compress !== null) {
        invalid();
      }
      pointer++;
      pieceIndex++;
      compress = pieceIndex;
      continue;
    }
    let value = 0;
    let length = 0;
    while (length < 4 && /[0-9A-Fa-f]/.test(input[pointer] ?? '')) {
      value = value * 16 + parseInt(input[pointer], 16);
      pointer++;
      length++;
    }
    if (input[pointer] === '.') {
      if (length === 0 || pieceIndex > 6) {
        invalid();
      }
      pointer -= length;
      const ipv4 = parseIpv6EmbeddedIpv4(input.slice(pointer));
      pieces[pieceIndex] = Math.floor(ipv4 / 65536);
      pieces[pieceIndex + 1] = ipv4 % 65536;
      pieceIndex += 2;
      pointer = input.length;
      break;
    }
    if (input[pointer] === ':') {
      pointer++;
      if (pointer === input.length) {
        invalid();
      }
    } else if (pointer < input.length) {
      invalid();
    }
    pieces[pieceIndex] = value;
    pieceIndex++;
  }
  if (compress !== null) {
    let swaps = pieceIndex - compress;
    pieceIndex = 7;
    while (pieceIndex !== 0 && swaps > 0) {
      const target = compress + swaps - 1;
      [pieces[pieceIndex], pieces[target]] = [
        pieces[target],
        pieces[pieceIndex],
      ];
      pieceIndex--;
      swaps--;
    }
  } else if (pieceIndex !== 8) {
    invalid();
  }
  return pieces;
}

function parseIpv6EmbeddedIpv4(input: string): number {
  const parts = input.split('.');
  if (parts.length !== 4) {
    fail('the URL has an invalid IPv6 address');
  }
  let address = 0;
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part) || Number(part) > 255) {
      fail('the URL has an invalid IPv6 address');
    }
    address = address * 256 + Number(part);
  }
  return address;
}

function serializeIpv6(pieces: number[]): string {
  let bestStart = -1;
  let bestLength = 1;
  for (let i = 0; i < 8; ) {
    if (pieces[i] !== 0) {
      i++;
      continue;
    }
    let end = i;
    while (end < 8 && pieces[end] === 0) {
      end++;
    }
    if (end - i > bestLength) {
      bestStart = i;
      bestLength = end - i;
    }
    i = end;
  }
  let output = '';
  let ignore0 = false;
  for (let i = 0; i < 8; i++) {
    if (ignore0 && pieces[i] === 0) {
      continue;
    }
    ignore0 = false;
    if (i === bestStart) {
      output += i === 0 ? '::' : ':';
      ignore0 = true;
      continue;
    }
    output += pieces[i].toString(16);
    if (i !== 7) {
      output += ':';
    }
  }
  return output;
}

function serializePath(rawPath: string): string {
  const segments = rawPath.replace(/\\/g, '/').split('/').slice(1);
  const output: string[] = [];
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const lowered = segment.toLowerCase();
    if (
      lowered === '..' ||
      lowered === '.%2e' ||
      lowered === '%2e.' ||
      lowered === '%2e%2e'
    ) {
      output.pop();
      if (isLast) {
        output.push('');
      }
      return;
    }
    if (lowered === '.' || lowered === '%2e') {
      if (isLast) {
        output.push('');
      }
      return;
    }
    output.push(percentEncode(segment, isPathByte));
  });
  return `/${output.join('/')}`;
}

function percentEncode(
  value: string,
  shouldEncode: (byte: number) => boolean
): string {
  let output = '';
  for (const byte of utf8Encode(value)) {
    output += shouldEncode(byte)
      ? `%${byte.toString(16).toUpperCase().padStart(2, '0')}`
      : String.fromCharCode(byte);
  }
  return output;
}

function isC0OrNonAscii(byte: number): boolean {
  return byte < 0x20 || byte > 0x7e;
}

function isQueryByte(byte: number): boolean {
  return isC0OrNonAscii(byte) || [0x20, 0x22, 0x23, 0x3c, 0x3e].includes(byte);
}

function isSpecialQueryByte(byte: number): boolean {
  return isQueryByte(byte) || byte === 0x27;
}

function isPathByte(byte: number): boolean {
  return isQueryByte(byte) || [0x3f, 0x5e, 0x60, 0x7b, 0x7d].includes(byte);
}

function isUserinfoByte(byte: number): boolean {
  return (
    isPathByte(byte) ||
    [0x2f, 0x3a, 0x3b, 0x3d, 0x40, 0x5b, 0x5c, 0x5d, 0x7c].includes(byte)
  );
}
