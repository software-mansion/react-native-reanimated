/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<46f54e9232abd5fdfafd3da87c9a104f>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Network/XMLHttpRequest.js
 */

import type { EventCallback, EventListener } from "../../src/private/webapis/dom/events/EventTarget";
import type { IPerformanceLogger } from "../Utilities/createPerformanceLogger";
import EventTarget from "../../src/private/webapis/dom/events/EventTarget";
export type NativeResponseType = "base64" | "blob" | "text";
export type ResponseType = "" | "arraybuffer" | "blob" | "document" | "json" | "text";
export type Response = (null | undefined | Object) | string;
declare class XMLHttpRequestEventTarget extends EventTarget {
  get onload(): EventCallback | null;
  set onload(listener: null | undefined | EventCallback);
  get onloadstart(): EventCallback | null;
  set onloadstart(listener: null | undefined | EventCallback);
  get onprogress(): EventCallback | null;
  set onprogress(listener: null | undefined | EventCallback);
  get ontimeout(): EventCallback | null;
  set ontimeout(listener: null | undefined | EventCallback);
  get onerror(): EventCallback | null;
  set onerror(listener: null | undefined | EventCallback);
  get onabort(): EventCallback | null;
  set onabort(listener: null | undefined | EventCallback);
  get onloadend(): EventCallback | null;
  set onloadend(listener: null | undefined | EventCallback);
}
/**
 * Shared base for platform-specific XMLHttpRequest implementations.
 */
declare class XMLHttpRequest extends EventTarget {
  static UNSENT: number;
  static OPENED: number;
  static HEADERS_RECEIVED: number;
  static LOADING: number;
  static DONE: number;
  UNSENT: number;
  OPENED: number;
  HEADERS_RECEIVED: number;
  LOADING: number;
  DONE: number;
  readyState: number;
  responseHeaders: null | undefined | Object;
  status: number;
  timeout: number;
  responseURL: null | undefined | string;
  withCredentials: boolean;
  upload: XMLHttpRequestEventTarget;
  static enableProfiling(enableProfiling: boolean): void;
  constructor();
  get responseType(): ResponseType;
  set responseType(responseType: ResponseType);
  get responseText(): string;
  get response(): Response;
  getAllResponseHeaders(): null | undefined | string;
  getResponseHeader(header: string): null | undefined | string;
  setRequestHeader(header: string, value: any): void;
  setTrackingName(trackingName: null | undefined | string): XMLHttpRequest;
  setPerformanceLogger(performanceLogger: IPerformanceLogger): XMLHttpRequest;
  open(method: string, url: string, async: null | undefined | boolean): void;
  send(data: any): void;
  abort(): void;
  setResponseHeaders(responseHeaders: null | undefined | Object): void;
  setReadyState(newState: number): void;
  addEventListener(type: string, listener: EventListener | null): void;
  get onabort(): EventCallback | null;
  set onabort(listener: null | undefined | EventCallback);
  get onerror(): EventCallback | null;
  set onerror(listener: null | undefined | EventCallback);
  get onload(): EventCallback | null;
  set onload(listener: null | undefined | EventCallback);
  get onloadstart(): EventCallback | null;
  set onloadstart(listener: null | undefined | EventCallback);
  get onprogress(): EventCallback | null;
  set onprogress(listener: null | undefined | EventCallback);
  get ontimeout(): EventCallback | null;
  set ontimeout(listener: null | undefined | EventCallback);
  get onloadend(): EventCallback | null;
  set onloadend(listener: null | undefined | EventCallback);
  get onreadystatechange(): EventCallback | null;
  set onreadystatechange(listener: null | undefined | EventCallback);
}
export default XMLHttpRequest;
