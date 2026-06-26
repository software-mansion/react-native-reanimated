#pragma once

#include <fbjni/fbjni.h>

#include <functional>
#include <utility>

namespace reanimated {

using namespace facebook::jni;

class PseudoSelectorCallback : public HybridClass<PseudoSelectorCallback> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeProxy/PseudoSelectorCallback;";

  void onSelectorStateChanged(jboolean isActive) {
    callback_(isActive);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("onSelectorStateChanged", PseudoSelectorCallback::onSelectorStateChanged),
    });
  }

 private:
  friend HybridBase;

  explicit PseudoSelectorCallback(std::function<void(bool)> callback) : callback_(std::move(callback)) {}

  std::function<void(bool)> callback_;
};

} // namespace reanimated
