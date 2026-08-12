'use strict';

import { Blob } from './Blob';
import { toArrayBuffer } from './bytes';
import type { NetworkingEventListener } from './events';
import { EventTargetLite } from './events';
import { FormData } from './FormData';

const UNSENT = 0;
const OPENED = 1;
const HEADERS_RECEIVED = 2;
const LOADING = 3;
const DONE = 4;

export type XMLHttpRequestResponseType =
  | ''
  | 'text'
  | 'arraybuffer'
  | 'blob'
  | 'json';

type ResponsePayload = {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  url: string;
};

type ProgressPayload = {
  loaded: number;
  total: number;
};

type DonePayload = {
  body?: string | ArrayBuffer;
  error?: 'timeout' | 'aborted' | 'network';
  message?: string;
};

export class XMLHttpRequestUpload extends EventTargetLite {}

export class XMLHttpRequest extends EventTargetLite {
  static readonly UNSENT = UNSENT;
  static readonly OPENED = OPENED;
  static readonly HEADERS_RECEIVED = HEADERS_RECEIVED;
  static readonly LOADING = LOADING;
  static readonly DONE = DONE;

  readonly UNSENT = UNSENT;
  readonly OPENED = OPENED;
  readonly HEADERS_RECEIVED = HEADERS_RECEIVED;
  readonly LOADING = LOADING;
  readonly DONE = DONE;

  readyState = UNSENT;
  status = 0;
  statusText = '';
  responseURL = '';
  timeout = 0;
  withCredentials = true;
  readonly upload = new XMLHttpRequestUpload();

  onreadystatechange: NetworkingEventListener | null = null;
  onloadstart: NetworkingEventListener | null = null;
  onprogress: NetworkingEventListener | null = null;
  onload: NetworkingEventListener | null = null;
  onloadend: NetworkingEventListener | null = null;
  onerror: NetworkingEventListener | null = null;
  ontimeout: NetworkingEventListener | null = null;
  onabort: NetworkingEventListener | null = null;

  private requestId: number | null = null;
  private requestToken = 0;
  private method = 'GET';
  private url = '';
  private sent = false;
  private hasRequestBody = false;
  private uploadSettled = false;
  private downloadedBytes = 0;
  private requestHeaders: Array<[string, string]> = [];
  private responseHeaders: Array<[string, string]> = [];
  private responseTypeValue: XMLHttpRequestResponseType = '';
  private responseTextValue = '';
  private responseBytes: ArrayBuffer | null = null;
  private responseBlobValue: Blob | null = null;
  private responseJsonValue: unknown = undefined;

  get responseType(): XMLHttpRequestResponseType {
    return this.responseTypeValue;
  }

  set responseType(value: XMLHttpRequestResponseType) {
    if (this.readyState >= LOADING) {
      throw new Error(
        "[Worklets] Failed to set 'responseType' on 'XMLHttpRequest': the response type cannot be changed once loading has started."
      );
    }
    this.responseTypeValue = value;
  }

  get response(): unknown {
    switch (this.responseTypeValue) {
      case '':
      case 'text':
        return this.responseTextValue;
      case 'arraybuffer':
        return this.readyState === DONE ? this.responseBytes : null;
      case 'blob':
        if (this.readyState !== DONE) {
          return null;
        }
        if (this.responseBlobValue === null) {
          this.responseBlobValue = new Blob(
            this.responseBytes !== null ? [this.responseBytes] : [],
            { type: this.getResponseHeader('content-type') ?? '' }
          );
        }
        return this.responseBlobValue;
      case 'json':
        if (this.readyState !== DONE) {
          return null;
        }
        if (this.responseJsonValue === undefined) {
          try {
            this.responseJsonValue = JSON.parse(this.responseTextValue);
          } catch {
            this.responseJsonValue = null;
          }
        }
        return this.responseJsonValue;
    }
  }

  get responseText(): string {
    if (this.responseTypeValue !== '' && this.responseTypeValue !== 'text') {
      throw new Error(
        "[Worklets] Failed to read 'responseText' on 'XMLHttpRequest': the value is only accessible if the object's 'responseType' is '' or 'text'."
      );
    }
    return this.responseTextValue;
  }

  open(method: string, url: string, async = true) {
    if (!async) {
      throw new Error(
        '[Worklets] Synchronous XMLHttpRequest is not supported.'
      );
    }
    if (this.requestId !== null) {
      globalThis.__workletsNetworking?.abortRequest(this.requestId);
      this.requestId = null;
    }
    this.method = String(method);
    this.url = String(url);
    this.sent = false;
    this.hasRequestBody = false;
    this.uploadSettled = false;
    this.downloadedBytes = 0;
    this.status = 0;
    this.statusText = '';
    this.responseURL = '';
    this.requestHeaders = [];
    this.responseHeaders = [];
    this.responseTextValue = '';
    this.responseBytes = null;
    this.responseBlobValue = null;
    this.responseJsonValue = undefined;
    this.setReadyState(OPENED);
  }

  setRequestHeader(name: string, value: string) {
    if (this.readyState !== OPENED || this.sent) {
      throw new Error(
        "[Worklets] Failed to execute 'setRequestHeader' on 'XMLHttpRequest': the object's state must be OPENED."
      );
    }
    this.requestHeaders.push([String(name), String(value)]);
  }

  getAllResponseHeaders(): string {
    let result = '';
    for (const [name, value] of this.responseHeaders) {
      result += `${name}: ${value}\r\n`;
    }
    return result;
  }

  getResponseHeader(name: string): string | null {
    const lowerCaseName = String(name).toLowerCase();
    const values = this.responseHeaders
      .filter(([headerName]) => headerName.toLowerCase() === lowerCaseName)
      .map(([, value]) => value);
    return values.length > 0 ? values.join(', ') : null;
  }

  overrideMimeType() {}

  send(body?: unknown) {
    const networking = globalThis.__workletsNetworking;
    if (networking === undefined) {
      throw new Error(
        '[Worklets] XMLHttpRequest is not available on this runtime.'
      );
    }
    if (this.readyState !== OPENED || this.sent) {
      throw new Error(
        "[Worklets] Failed to execute 'send' on 'XMLHttpRequest': the object's state must be OPENED."
      );
    }
    this.sent = true;

    const normalizedMethod = this.method.toUpperCase();
    const { data, contentType } =
      normalizedMethod === 'GET' || normalizedMethod === 'HEAD'
        ? { data: undefined, contentType: undefined }
        : normalizeBody(body);
    const headers = [...this.requestHeaders];
    if (
      contentType !== undefined &&
      !headers.some(([name]) => name.toLowerCase() === 'content-type')
    ) {
      headers.push(['Content-Type', contentType]);
    }
    this.hasRequestBody = data !== undefined;

    const token = ++this.requestToken;
    this.requestId = networking.sendRequest(
      {
        method: this.method,
        url: this.url,
        headers,
        body: data,
        responseKind:
          this.responseTypeValue === 'arraybuffer' ||
          this.responseTypeValue === 'blob'
            ? 'bytes'
            : 'text',
        timeoutMs: this.timeout,
        withCredentials: this.withCredentials,
      },
      (type, payload) => {
        if (token === this.requestToken && this.requestId !== null) {
          this.handleNetworkingEvent(type, payload);
        }
      }
    );

    this.__dispatch('loadstart');
    if (this.hasRequestBody) {
      this.upload.__dispatch('loadstart');
    }
  }

  abort() {
    const wasInFlight = this.requestId !== null;
    if (wasInFlight) {
      globalThis.__workletsNetworking?.abortRequest(this.requestId!);
      this.requestId = null;
    }
    if (!wasInFlight || this.readyState === DONE) {
      return;
    }
    this.settleUpload('abort');
    this.setReadyState(DONE);
    this.__dispatch('abort');
    this.__dispatch('loadend');
    this.readyState = UNSENT;
  }

  private handleNetworkingEvent(type: string, payload: unknown) {
    switch (type) {
      case 'response': {
        const { status, statusText, headers, url } = payload as ResponsePayload;
        this.status = status;
        this.statusText = statusText;
        this.responseHeaders = headers;
        this.responseURL = url;
        this.setReadyState(HEADERS_RECEIVED);
        break;
      }
      case 'downloadProgress': {
        const { loaded, total } = payload as ProgressPayload;
        if (this.readyState === HEADERS_RECEIVED) {
          this.setReadyState(LOADING);
        }
        this.downloadedBytes = loaded;
        this.__dispatch('progress', {
          loaded,
          total: total >= 0 ? total : 0,
          lengthComputable: total >= 0,
        });
        break;
      }
      case 'uploadProgress': {
        const { loaded, total } = payload as ProgressPayload;
        this.upload.__dispatch('progress', {
          loaded,
          total: total >= 0 ? total : 0,
          lengthComputable: total >= 0,
        });
        break;
      }
      case 'done': {
        this.requestId = null;
        const { body, error, message } = payload as DonePayload;
        if (error !== undefined) {
          const terminalEvent =
            error === 'timeout'
              ? 'timeout'
              : error === 'aborted'
                ? 'abort'
                : 'error';
          this.settleUpload(terminalEvent);
          this.setReadyState(DONE);
          this.__dispatch(terminalEvent, { message });
          this.__dispatch('loadend');
        } else if (this.status === 0) {
          this.settleUpload('error');
          this.setReadyState(DONE);
          this.__dispatch('error', {
            message: 'The request completed without a response.',
          });
          this.__dispatch('loadend');
        } else {
          if (typeof body === 'string') {
            this.responseTextValue = body;
          } else if (body !== undefined) {
            this.responseBytes = body;
          }
          this.settleUpload('load');
          const bodySize = Math.max(
            typeof body === 'string' ? body.length : (body?.byteLength ?? 0),
            this.downloadedBytes
          );
          this.__dispatch('progress', {
            loaded: bodySize,
            total: bodySize,
            lengthComputable: true,
          });
          this.setReadyState(DONE);
          this.__dispatch('load');
          this.__dispatch('loadend');
        }
        break;
      }
    }
  }

  private settleUpload(type: string) {
    if (!this.hasRequestBody || this.uploadSettled) {
      return;
    }
    this.uploadSettled = true;
    this.upload.__dispatch(type);
    this.upload.__dispatch('loadend');
  }

  private setReadyState(readyState: number) {
    this.readyState = readyState;
    this.__dispatch('readystatechange');
  }
}

function normalizeBody(body: unknown): {
  data?: string | ArrayBuffer;
  contentType?: string;
} {
  if (body === null || body === undefined) {
    return {};
  }
  if (typeof body === 'string') {
    return { data: body, contentType: 'text/plain;charset=UTF-8' };
  }
  if (body instanceof ArrayBuffer) {
    return { data: body };
  }
  if (ArrayBuffer.isView(body)) {
    return {
      data: toArrayBuffer(
        new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
      ),
    };
  }
  if (body instanceof Blob) {
    return {
      data: toArrayBuffer(body.__getBytes()),
      contentType: body.type !== '' ? body.type : undefined,
    };
  }
  if (body instanceof FormData) {
    const { body: data, contentType } = body.__encodeMultipart();
    return { data, contentType };
  }
  return { data: String(body as { toString(): string }) };
}
