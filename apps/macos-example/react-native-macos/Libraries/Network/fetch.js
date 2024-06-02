/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

/* globals Headers, Request, Response */

'use strict';

// side-effectful require() to put fetch,
// Headers, Request, Response in global scope
require('whatwg-fetch');

module.exports = {fetch, Headers, Request, Response};
