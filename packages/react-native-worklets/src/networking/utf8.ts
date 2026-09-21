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
  let codePoint = 0;
  let bytesNeeded = 0;
  let bytesSeen = 0;
  let lowerBoundary = 0x80;
  let upperBoundary = 0xbf;
  let index = 0;
  while (index < bytes.length) {
    const byte = bytes[index];
    if (bytesNeeded === 0) {
      index++;
      if (byte <= 0x7f) {
        codePoints.push(byte);
      } else if (byte >= 0xc2 && byte <= 0xdf) {
        bytesNeeded = 1;
        codePoint = byte & 0x1f;
      } else if (byte >= 0xe0 && byte <= 0xef) {
        lowerBoundary = byte === 0xe0 ? 0xa0 : 0x80;
        upperBoundary = byte === 0xed ? 0x9f : 0xbf;
        bytesNeeded = 2;
        codePoint = byte & 0x0f;
      } else if (byte >= 0xf0 && byte <= 0xf4) {
        lowerBoundary = byte === 0xf0 ? 0x90 : 0x80;
        upperBoundary = byte === 0xf4 ? 0x8f : 0xbf;
        bytesNeeded = 3;
        codePoint = byte & 0x07;
      } else {
        codePoints.push(0xfffd);
      }
      continue;
    }
    if (byte < lowerBoundary || byte > upperBoundary) {
      codePoint = 0;
      bytesNeeded = 0;
      bytesSeen = 0;
      lowerBoundary = 0x80;
      upperBoundary = 0xbf;
      codePoints.push(0xfffd);
      continue;
    }
    lowerBoundary = 0x80;
    upperBoundary = 0xbf;
    codePoint = (codePoint << 6) | (byte & 0x3f);
    bytesSeen++;
    index++;
    if (bytesSeen === bytesNeeded) {
      codePoints.push(codePoint);
      codePoint = 0;
      bytesNeeded = 0;
      bytesSeen = 0;
    }
  }
  if (bytesNeeded !== 0) {
    codePoints.push(0xfffd);
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

export function stripUtf8Bom(bytes: Uint8Array): Uint8Array {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return bytes.subarray(3);
  }
  return bytes;
}
