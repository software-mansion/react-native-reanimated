#pragma once

#include <fbjni/fbjni.h>

#include <utility>

namespace worklets {

class AnimationFrameCallback
    : public facebook::jni::HybridClass<AnimationFrameCallback> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/worklets/runloop/AnimationFrameCallback;";

  void onAnimationFrame(double timestampMs) {
    callback_(timestampMs);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod(
            "onAnimationFrame", AnimationFrameCallback::onAnimationFrame),
    });
  }

 private:
  friend HybridBase;

  explicit AnimationFrameCallback(std::function<void(const double)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(double)> callback_;
};
} // namespace worklets
