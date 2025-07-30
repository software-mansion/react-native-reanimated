/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<198d3a369a49a9243a1bd29386d93a0c>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Network/FormData.js
 */

type FormDataValue = string | {
  name?: string;
  type?: string;
  uri: string;
};
type Headers = {
  [name: string]: string;
};
type FormDataPart = {
  string: string;
  headers: Headers;
} | {
  uri: string;
  headers: Headers;
  name?: string;
  type?: string;
};
/**
 * Polyfill for XMLHttpRequest2 FormData API, allowing multipart POST requests
 * with mixed data (string, native files) to be submitted via XMLHttpRequest.
 *
 * Example:
 *
 *   var photo = {
 *     uri: uriFromCameraRoll,
 *     type: 'image/jpeg',
 *     name: 'photo.jpg',
 *   };
 *
 *   var body = new FormData();
 *   body.append('authToken', 'secret');
 *   body.append('photo', photo);
 *   body.append('title', 'A beautiful photo!');
 *
 *   xhr.open('POST', serverURL);
 *   xhr.send(body);
 */
declare class FormData {
  constructor();
  append(key: string, value: FormDataValue): void;
  getAll(key: string): Array<FormDataValue>;
  getParts(): Array<FormDataPart>;
}
export default FormData;
