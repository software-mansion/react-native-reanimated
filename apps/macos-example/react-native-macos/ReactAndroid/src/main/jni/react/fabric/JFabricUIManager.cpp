/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "JFabricUIManager.h"

#include "Binding.h"

namespace facebook::react {

Binding* JFabricUIManager::getBinding() {
  static const auto bindingField =
      javaClassStatic()->getField<JBinding::javaobject>("mBinding");

  return jni::static_ref_cast<Binding::javaobject>(getFieldValue(bindingField))
      ->cthis();
}
} // namespace facebook::react
