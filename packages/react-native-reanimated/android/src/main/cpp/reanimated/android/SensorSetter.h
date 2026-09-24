#pragma once

#include <fbjni/fbjni.h>

#include <algorithm>
#include <utility>

namespace reanimated {

using namespace facebook;
using namespace facebook::jni;

class SensorSetter : public HybridClass<SensorSetter> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeProxy/SensorSetter;";

  void sensorSetter(jni::alias_ref<JArrayFloat> value, int orientationDegrees) {
    static constexpr size_t kMaxSize = 7;
    const size_t size = std::min(static_cast<size_t>(value->size()), kMaxSize);
    jfloat elements[kMaxSize];
    value->getRegion(0, size, elements);
    double array[kMaxSize];
    for (size_t i = 0; i < size; i++) {
      array[i] = elements[i];
    }
    callback_(array, orientationDegrees);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("sensorSetter", SensorSetter::sensorSetter),
    });
  }

 private:
  friend HybridBase;

  explicit SensorSetter(std::function<void(double[], int)> callback) : callback_(std::move(callback)) {}

  std::function<void(double[], int)> callback_;
};

} // namespace reanimated
