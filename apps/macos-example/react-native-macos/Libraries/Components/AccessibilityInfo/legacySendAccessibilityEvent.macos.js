/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

// [macOS]

/* $FlowFixMe allow macOS to share iOS file */
const legacySendAccessibilityEvent = require('./legacySendAccessibilityEvent.ios');

module.exports = legacySendAccessibilityEvent;
