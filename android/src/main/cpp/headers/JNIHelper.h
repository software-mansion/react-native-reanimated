//
// Created by Szymon Kapala on 4/16/21.
//

#ifndef REANIMATEDEXAMPLE_JNIHELPER_H
#define REANIMATEDEXAMPLE_JNIHELPER_H

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/WritableNativeMap.h>
#include <jsi/JSIDynamic.h>

namespace reanimated {

using namespace facebook::jni;
using namespace facebook;
using namespace react;

struct JNIHelper {

    struct PropsMap : jni::JavaClass<PropsMap, JMap<JString, JObject>>
    {
      static constexpr auto kJavaDescriptor = "Ljava/util/HashMap;";

      static local_ref<PropsMap> create();
      void put(const std::string &key, jni::local_ref<JObject> object);
    };

    static jni::local_ref<PropsMap> ConvertToPropsMap(jsi::Runtime &rt, const jsi::Object &props);
};

};

#endif //REANIMATEDEXAMPLE_JNIHELPER_H
