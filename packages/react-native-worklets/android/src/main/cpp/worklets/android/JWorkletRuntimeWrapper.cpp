/**
 * Based on
 * https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/src/main/jni/react/jni/JSLoader.cpp
 */

#include <fbjni/detail/References.h>
#include <fbjni/detail/Registration.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/jni/WritableNativeArray.h>
#include <worklets/android/JWorkletRuntimeWrapper.h>
#include <utility>

namespace worklets {

using namespace facebook::jni;

local_ref<JWorkletRuntimeWrapper::JavaPart> JWorkletRuntimeWrapper::makeJWorkletRuntimeWrapper(
    std::shared_ptr<WorkletRuntime> workletRuntime) {
  return JWorkletRuntimeWrapper::newObjectCxxArgs(std::move(workletRuntime), workletRuntime->getRuntimeId());
}

JWorkletRuntimeWrapper::JWorkletRuntimeWrapper(std::shared_ptr<WorkletRuntime> workletRuntime, uint64_t runtimeId)
    : workletRuntime_(std::move(workletRuntime)) {}

void JWorkletRuntimeWrapper::emitDeviceEvent(
    jni::alias_ref<WritableNativeArray::javaobject> params // NOLINT //(performance-unnecessary-value-param
) {
  workletRuntime_->schedule([params = params->cthis()->consume()](jsi::Runtime &rt) {
    facebook::jsi::Value emitter = rt.global().getProperty(rt, "__rctDeviceEventEmitter");
    if (!emitter.isUndefined()) {
      facebook::jsi::Object emitterObject = emitter.asObject(rt);
      facebook::jsi::Function emitFunction = emitterObject.getPropertyAsFunction(rt, "emit");
      std::vector<jsi::Value> jsArgs;
      for (auto &param : params) {
        jsArgs.push_back(jsi::valueFromDynamic(rt, param));
      }

      emitFunction.callWithThis(rt, emitterObject, static_cast<const jsi::Value *>(jsArgs.data()), jsArgs.size());
    }
  });
}

int JWorkletRuntimeWrapper::getRuntimeId() {
  return static_cast<int>(workletRuntime_->getRuntimeId());
}

void JWorkletRuntimeWrapper::registerNatives() {
  registerHybrid(
      {makeNativeMethod("cxxEmitDeviceEvent", JWorkletRuntimeWrapper::emitDeviceEvent),
       makeNativeMethod("cxxGetRuntimeId", JWorkletRuntimeWrapper::getRuntimeId)});
}
} // namespace worklets
