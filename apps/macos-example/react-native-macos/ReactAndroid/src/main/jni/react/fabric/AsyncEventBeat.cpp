/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <jsi/jsi.h>
#include <react/renderer/core/EventBeat.h>
#include <react/renderer/uimanager/primitives.h>

#include "AsyncEventBeat.h"

namespace facebook::react {

AsyncEventBeat::AsyncEventBeat(
    const EventBeat::SharedOwnerBox& ownerBox,
    EventBeatManager* eventBeatManager,
    RuntimeExecutor runtimeExecutor,
    jni::global_ref<jobject> javaUIManager)
    : EventBeat(ownerBox),
      eventBeatManager_(eventBeatManager),
      runtimeExecutor_(std::move(runtimeExecutor)),
      javaUIManager_(std::move(javaUIManager)) {
  eventBeatManager->addObserver(*this);
}

AsyncEventBeat::~AsyncEventBeat() {
  eventBeatManager_->removeObserver(*this);
}

void AsyncEventBeat::tick() const {
  if (!isRequested_ || isBeatCallbackScheduled_) {
    return;
  }

  isRequested_ = false;
  isBeatCallbackScheduled_ = true;

  runtimeExecutor_([this, ownerBox = ownerBox_](jsi::Runtime& runtime) {
    isBeatCallbackScheduled_ = false;
    auto owner = ownerBox->owner.lock();
    if (!owner) {
      return;
    }

    if (beatCallback_) {
      beatCallback_(runtime);
    }
  });
}

void AsyncEventBeat::induce() const {
  tick();
}

void AsyncEventBeat::request() const {
  bool alreadyRequested = isRequested_;
  EventBeat::request();
  if (!alreadyRequested) {
    // Notifies java side that an event will be dispatched (e.g. LayoutEvent)
    static auto onRequestEventBeat =
        jni::findClassStatic("com/facebook/react/fabric/FabricUIManager")
            ->getMethod<void()>("onRequestEventBeat");
    onRequestEventBeat(javaUIManager_);
  }
}

} // namespace facebook::react
