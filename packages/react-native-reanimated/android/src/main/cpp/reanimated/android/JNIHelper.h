#pragma once

#include <fbjni/detail/CoreClasses.h>
#include <fbjni/fbjni.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/WritableNativeMap.h>
#include <string>

namespace reanimated {
struct JNIHelper {
  struct PropsMap
      : facebook::jni::JavaClass<
            PropsMap,
            facebook::jni::
                JMap<facebook::jni::JString, facebook::jni::JObject>> {
    static constexpr auto kJavaDescriptor = "Ljava/util/HashMap;";

    static facebook::jni::local_ref<PropsMap> create();
    void put(const std::string &key, facebook::jni::local_ref<JObject> object);
  };

  static facebook::jni::local_ref<PropsMap> ConvertToPropsMap(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Object &props);
};

}; // namespace reanimated
