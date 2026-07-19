#pragma once

#include <fbjni/fbjni.h>

#include <functional>
#include <utility>

namespace reanimated {

using namespace facebook::jni;

// Bridges the completion of a native (platform-animator) layout animation back
// to C++. Mirrors `PseudoSelectorCallback`: the Kotlin side calls
// `onAnimationEnd` when the animation finishes or is cancelled.
class LayoutAnimationCallback : public HybridClass<LayoutAnimationCallback> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeProxy/LayoutAnimationCallback;";

  void onAnimationEnd(jboolean finished) {
    callback_(finished);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("onAnimationEnd", LayoutAnimationCallback::onAnimationEnd),
    });
  }

 private:
  friend HybridBase;

  explicit LayoutAnimationCallback(std::function<void(bool)> callback) : callback_(std::move(callback)) {}

  std::function<void(bool)> callback_;
};

} // namespace reanimated
