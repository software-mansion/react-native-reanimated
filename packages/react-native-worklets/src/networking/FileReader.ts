'use strict';

import type { Blob } from './Blob';
import { toArrayBuffer } from './bytes';
import { utf8Decode } from './utf8';

const EMPTY = 0;
const LOADING = 1;
const DONE = 2;

const CHARSET_PARAMETER_PATTERN = /;\s*charset\s*=\s*("([^"]*)"|([^;\s]*))/i;

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
    this.read(() => toArrayBuffer(readBytes(blob)));
  }

  readAsText(blob: Blob, encoding?: string) {
    this.read(() => {
      const bytes = readBytes(blob);
      const resolvedEncoding = encoding ?? extractCharset(blob.type);
      const networking = globalThis.__workletsNetworking;
      if (networking !== undefined) {
        return networking.decodeText(toArrayBuffer(bytes), resolvedEncoding);
      }
      return utf8Decode(bytes);
    });
  }

  private read(produceResult: () => string | ArrayBuffer) {
    if (this.readyState === LOADING) {
      throw new Error(
        "[Worklets] Failed to execute 'read' on 'FileReader': the object is already loading."
      );
    }
    this.result = null;
    this.error = null;
    this.readyState = LOADING;
    /**
     * The File API fires read events from a task, not from a microtask, so
     * `setTimeout` is used here rather than `queueMicrotask`. Reads are started
     * from Promise continuations, which makes the distinction observable.
     */
    setTimeout(() => {
      let failed = false;
      try {
        this.result = produceResult();
      } catch (error) {
        this.error = error;
        failed = true;
      }
      this.readyState = DONE;
      invoke(failed ? this.onerror : this.onload);
      invoke(this.onloadend);
    });
  }
}

function invoke(handler: (() => void) | null) {
  try {
    handler?.();
  } catch (error) {
    console.error(error);
  }
}

function readBytes(blob: Blob): Uint8Array {
  if (typeof blob?.__getBytes !== 'function') {
    throw new Error(
      '[Worklets] FileReader can only read a Blob created by the Worklets networking module.'
    );
  }
  return blob.__getBytes();
}

function extractCharset(mimeType: string): string | undefined {
  const match = CHARSET_PARAMETER_PATTERN.exec(mimeType);
  if (match === null) {
    return undefined;
  }
  const charset = match[2] ?? match[3] ?? '';
  return charset !== '' ? charset : undefined;
}
