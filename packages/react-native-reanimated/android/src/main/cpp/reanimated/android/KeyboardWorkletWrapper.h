#pragma once

#include <fbjni/fbjni.h>

#include <utility>

namespace reanimated {

using namespace facebook;
using namespace facebook::jni;

class KeyboardWorkletWrapper : public HybridClass<KeyboardWorkletWrapper> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/keyboard/KeyboardWorkletWrapper;";

  void invoke(int keyboardState, int height) {
    callback_(keyboardState, height);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("invoke", KeyboardWorkletWrapper::invoke),
    });
  }

 private:
  friend HybridBase;

  explicit KeyboardWorkletWrapper(std::function<void(int, int)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(int, int)> callback_;
};

} // namespace reanimated
