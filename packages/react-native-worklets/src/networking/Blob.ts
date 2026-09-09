'use strict';

import { toArrayBuffer } from './bytes';
import { utf8Decode, utf8Encode } from './utf8';

export type BlobPart = string | ArrayBuffer | ArrayBufferView | Blob;

export class Blob {
  readonly type: string;

  private bytes: Uint8Array;

  constructor(parts: BlobPart[] = [], options: { type?: string } = {}) {
    const chunks = parts.map(toUint8Array);
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    this.bytes = bytes;
    this.type = String(options.type ?? '').toLowerCase();
  }

  get size(): number {
    return this.bytes.byteLength;
  }

  get [Symbol.toStringTag]() {
    return 'Blob';
  }

  slice(start = 0, end = this.size, contentType = ''): Blob {
    const size = this.size;
    const relativeStart =
      start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
    const relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
    const span = Math.max(relativeEnd - relativeStart, 0);
    const blob = new Blob([], { type: contentType });
    blob.bytes = this.bytes.slice(relativeStart, relativeStart + span);
    return blob;
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(toArrayBuffer(this.bytes));
  }

  text(): Promise<string> {
    return Promise.resolve(utf8Decode(this.bytes));
  }

  __getBytes(): Uint8Array {
    return this.bytes;
  }
}

function toUint8Array(part: BlobPart): Uint8Array {
  if (typeof part === 'string') {
    return utf8Encode(part);
  }
  if (part instanceof Blob) {
    return part.__getBytes();
  }
  if (ArrayBuffer.isView(part)) {
    return new Uint8Array(
      part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength)
    );
  }
  if (part instanceof ArrayBuffer) {
    return new Uint8Array(part.slice(0));
  }
  return utf8Encode(String(part));
}
