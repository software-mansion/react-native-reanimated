#include "NativeProxy.h"
#include <jni.h>
#include <string>
#include <android/log.h>
#include "NativeReanimatedModule.h"
#include <jsi/jsi.h>
#define APPNAME "NATIVE_REANIMATED"

using namespace facebook;
using namespace react;

extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_NativeProxy_install(JNIEnv* env, jobject thiz, jlong runtimePtr) {
    auto &runtime = *(facebook::jsi::Runtime *)runtimePtr;

    auto module = std::make_shared<NativeReanimatedModule>();
    auto object = jsi::Object::createFromHostObject(runtime, module);

    jsi::String propName = jsi::String::createFromAscii(runtime, module->name_);
    runtime.global().setProperty(runtime, propName, std::move(object));
}

