/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "CompositeTurboModuleManagerDelegate.h"

namespace facebook::react {

jni::local_ref<CompositeTurboModuleManagerDelegate::jhybriddata>
CompositeTurboModuleManagerDelegate::initHybrid(jni::alias_ref<jhybridobject>) {
  return makeCxxInstance();
}

void CompositeTurboModuleManagerDelegate::registerNatives() {
  registerHybrid({
      makeNativeMethod(
          "initHybrid", CompositeTurboModuleManagerDelegate::initHybrid),
      makeNativeMethod(
          "addTurboModuleManagerDelegate",
          CompositeTurboModuleManagerDelegate::addTurboModuleManagerDelegate),
  });
}

std::shared_ptr<TurboModule>
CompositeTurboModuleManagerDelegate::getTurboModule(
    const std::string& moduleName,
    const std::shared_ptr<CallInvoker>& jsInvoker) {
  for (auto delegate : mDelegates_) {
    if (auto turboModule =
            delegate->cthis()->getTurboModule(moduleName, jsInvoker)) {
      return turboModule;
    }
  }
  return nullptr;
}

std::shared_ptr<TurboModule>
CompositeTurboModuleManagerDelegate::getTurboModule(
    const std::string& moduleName,
    const JavaTurboModule::InitParams& params) {
  for (auto delegate : mDelegates_) {
    if (auto turboModule =
            delegate->cthis()->getTurboModule(moduleName, params)) {
      return turboModule;
    }
  }
  return nullptr;
}

void CompositeTurboModuleManagerDelegate::addTurboModuleManagerDelegate(
    jni::alias_ref<TurboModuleManagerDelegate::javaobject> delegate) {
  mDelegates_.push_back(jni::make_global(delegate));
}

} // namespace facebook::react
