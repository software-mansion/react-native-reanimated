/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<0b2a6d687e11aad156edcfdb6d4d0329>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/src/private/types/HostComponent.js
 */

import * as React from "react";
import type { HostInstance } from "./HostInstance";
export type HostComponent<Config extends {}> = (props: Omit<Config, keyof {
  ref?: React.Ref<HostInstance>;
}> & {
  ref?: React.Ref<HostInstance>;
}) => React.ReactNode;
