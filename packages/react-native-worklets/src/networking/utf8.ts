/* eslint-disable no-bitwise */
'use strict';

type TextEncoderLike = new () => { encode: (value: string) => Uint8Array };

export function utf8Encode(value: string): Uint8Array {
  const TextEncoderConstructor = (
    globalThis as { TextEncoder?: TextEncoderLike }
  ).TextEncoder;
  if (TextEncoderConstructor !== undefined) {
    return new TextEncoderConstructor().encode(value);
  }

  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    let codePoint = value.codePointAt(i)!;
    if (codePoint > 0xffff) {
      i++;
    }
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      codePoint = 0xfffd;
    }
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

export function utf8Decode(bytes: Uint8Array): string {
  const codePoints: number[] = [];
  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];
    let codePoint = 0xfffd;
    let length = 1;
    if (byte < 0x80) {
      codePoint = byte;
    } else if ((byte & 0xe0) === 0xc0 && isContinuation(bytes, i + 1, 1)) {
      length = 2;
      codePoint = ((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      if (codePoint < 0x80) {
        codePoint = 0xfffd;
      }
    } else if ((byte & 0xf0) === 0xe0 && isContinuation(bytes, i + 1, 2)) {
      length = 3;
      codePoint =
        ((byte & 0x0f) << 12) |
        ((bytes[i + 1] & 0x3f) << 6) |
        (bytes[i + 2] & 0x3f);
      if (codePoint < 0x800 || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        codePoint = 0xfffd;
      }
    } else if ((byte & 0xf8) === 0xf0 && isContinuation(bytes, i + 1, 3)) {
      length = 4;
      codePoint =
        ((byte & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      if (codePoint < 0x10000 || codePoint > 0x10ffff) {
        codePoint = 0xfffd;
      }
    }
    codePoints.push(codePoint);
    i += length;
  }

  let result = '';
  const chunkSize = 4096;
  for (let offset = 0; offset < codePoints.length; offset += chunkSize) {
    result += String.fromCodePoint(
      ...codePoints.slice(offset, offset + chunkSize)
    );
  }
  return result;
}

function isContinuation(bytes: Uint8Array, start: number, count: number) {
  if (start + count > bytes.length) {
    return false;
  }
  for (let i = start; i < start + count; i++) {
    if ((bytes[i] & 0xc0) !== 0x80) {
      return false;
    }
  }
  return true;
}
