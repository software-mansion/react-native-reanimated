#pragma once

#include <fbjni/fbjni.h>

#include <utility>

namespace reanimated {

using namespace facebook;
using namespace facebook::jni;

class SensorSetter : public HybridClass<SensorSetter> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/nativeProxy/SensorSetter;";

  void sensorSetter(jni::alias_ref<JArrayFloat> value, int orientationDegrees) {
    size_t size = value->size();
    auto elements = value->getRegion(0, size);
    double array[7];
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

  explicit SensorSetter(std::function<void(double[], int)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(double[], int)> callback_;
};

} // namespace reanimated
