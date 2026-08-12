'use strict';

import type { Blob } from './Blob';
import { toArrayBuffer } from './bytes';
import { utf8Decode } from './utf8';

const EMPTY = 0;
const LOADING = 1;
const DONE = 2;

export class FileReader {
  static readonly EMPTY = EMPTY;
  static readonly LOADING = LOADING;
  static readonly DONE = DONE;

  readonly EMPTY = EMPTY;
  readonly LOADING = LOADING;
  readonly DONE = DONE;

  readyState = EMPTY;
  result: string | ArrayBuffer | null = null;
  error: unknown = null;

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onloadend: (() => void) | null = null;

  readAsArrayBuffer(blob: Blob) {
    this.read(() => toArrayBuffer(blob.__getBytes()));
  }

  readAsText(blob: Blob, encoding?: string) {
    this.read(() => {
      const bytes = blob.__getBytes();
      const resolvedEncoding =
        encoding ?? /charset=([^;]+)/i.exec(blob.type)?.[1];
      const networking = globalThis.__workletsNetworking;
      if (networking !== undefined) {
        return networking.decodeText(toArrayBuffer(bytes), resolvedEncoding);
      }
      return utf8Decode(bytes);
    });
  }

  private read(produceResult: () => string | ArrayBuffer) {
    this.readyState = LOADING;
    queueMicrotask(() => {
      try {
        this.result = produceResult();
        this.readyState = DONE;
        this.onload?.();
      } catch (error) {
        this.error = error;
        this.readyState = DONE;
        this.onerror?.();
      } finally {
        this.onloadend?.();
      }
    });
  }
}
