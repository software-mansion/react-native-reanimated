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
    // The Android sensor APIs feeding this callback emit at most 7 floats
    // (rotation vector with heading accuracy is the largest payload). Clamp
    // defensively so a malformed JArrayFloat can't overflow the stack
    // buffer below.
    constexpr size_t kMaxSensorValues = 7;
    size_t size = std::min<size_t>(value->size(), kMaxSensorValues);
    auto elements = value->getRegion(0, size);
    double array[kMaxSensorValues];
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
