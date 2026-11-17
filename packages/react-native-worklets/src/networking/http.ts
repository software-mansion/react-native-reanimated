'use strict';

const TOKEN_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const HEADER_VALUE_PATTERN = /^[^\0\r\n]*$/;
const HTTP_WHITESPACE_PATTERN = /^[\t\n\r ]+|[\t\n\r ]+$/g;
const ABSOLUTE_URL_SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+\-.]*):/;
const CHARSET_PARAMETER_PATTERN = /;\s*charset\s*=\s*("([^"]*)"|([^;\s]*))/i;

const NORMALIZED_METHODS = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];
const FORBIDDEN_METHODS = ['CONNECT', 'TRACE', 'TRACK'];
const SUPPORTED_SCHEMES = ['http', 'https'];

const FORBIDDEN_REQUEST_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'set-cookie',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
]);
const FORBIDDEN_REQUEST_HEADER_PREFIXES = ['proxy-', 'sec-'];
const METHOD_OVERRIDE_HEADERS = new Set([
  'x-http-method',
  'x-http-method-override',
  'x-method-override',
]);
const FORBIDDEN_RESPONSE_HEADERS = new Set(['set-cookie', 'set-cookie2']);

export function normalizeMethod(method: string): string {
  const uppercasedMethod = method.toUpperCase();
  return NORMALIZED_METHODS.includes(uppercasedMethod)
    ? uppercasedMethod
    : method;
}

export function isToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

export function isForbiddenMethod(method: string): boolean {
  return FORBIDDEN_METHODS.includes(method.toUpperCase());
}

export function isSupportedRequestUrl(url: string): boolean {
  const scheme = ABSOLUTE_URL_SCHEME_PATTERN.exec(url)?.[1];
  return (
    scheme !== undefined && SUPPORTED_SCHEMES.includes(scheme.toLowerCase())
  );
}

export function isHeaderName(name: string): boolean {
  return isToken(name);
}

export function isHeaderValue(value: string): boolean {
  return HEADER_VALUE_PATTERN.test(value);
}

export function normalizeHeaderValue(value: string): string {
  return value.replace(HTTP_WHITESPACE_PATTERN, '');
}

export function isForbiddenRequestHeader(name: string, value: string): boolean {
  const lowerCaseName = name.toLowerCase();
  if (
    FORBIDDEN_REQUEST_HEADERS.has(lowerCaseName) ||
    FORBIDDEN_REQUEST_HEADER_PREFIXES.some((prefix) =>
      lowerCaseName.startsWith(prefix)
    )
  ) {
    return true;
  }
  return (
    METHOD_OVERRIDE_HEADERS.has(lowerCaseName) &&
    value.split(',').some((method) => isForbiddenMethod(method.trim()))
  );
}

export function combineHeader(
  headers: Array<[string, string]>,
  name: string,
  value: string
) {
  const lowerCaseName = name.toLowerCase();
  const existing = headers.find(
    ([headerName]) => headerName.toLowerCase() === lowerCaseName
  );
  if (existing === undefined) {
    headers.push([name, value]);
  } else {
    existing[1] = `${existing[1]}, ${value}`;
  }
}

export function hasHeader(
  headers: Array<[string, string]>,
  name: string
): boolean {
  const lowerCaseName = name.toLowerCase();
  return headers.some(
    ([headerName]) => headerName.toLowerCase() === lowerCaseName
  );
}

export function getHeader(
  headers: Array<[string, string]>,
  name: string
): string | null {
  const lowerCaseName = name.toLowerCase();
  if (FORBIDDEN_RESPONSE_HEADERS.has(lowerCaseName)) {
    return null;
  }
  const values = headers
    .filter(([headerName]) => headerName.toLowerCase() === lowerCaseName)
    .map(([, value]) => value);
  return values.length > 0 ? values.join(', ') : null;
}

export function sortAndCombineHeaders(
  headers: Array<[string, string]>
): string {
  const combined = new Map<string, string[]>();
  for (const [name, value] of headers) {
    const lowerCaseName = name.toLowerCase();
    if (FORBIDDEN_RESPONSE_HEADERS.has(lowerCaseName)) {
      continue;
    }
    const values = combined.get(lowerCaseName);
    if (values === undefined) {
      combined.set(lowerCaseName, [value]);
    } else {
      values.push(value);
    }
  }
  return Array.from(combined.keys())
    .sort((left, right) => {
      const uppercasedLeft = left.toUpperCase();
      const uppercasedRight = right.toUpperCase();
      if (uppercasedLeft === uppercasedRight) {
        return 0;
      }
      return uppercasedLeft < uppercasedRight ? -1 : 1;
    })
    .map((name) => `${name}: ${combined.get(name)!.join(', ')}\r\n`)
    .join('');
}

export function extractCharset(mimeType: string | null): string | undefined {
  if (mimeType === null) {
    return undefined;
  }
  const match = CHARSET_PARAMETER_PATTERN.exec(mimeType);
  if (match === null) {
    return undefined;
  }
  const charset = match[2] ?? match[3] ?? '';
  return charset !== '' ? charset : undefined;
}
