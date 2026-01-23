#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)

#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
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

void JWorkletRuntimeWrapper::cxxEmitDeviceEvent(
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

int JWorkletRuntimeWrapper::cxxGetRuntimeId() {
  return static_cast<int>(workletRuntime_->getRuntimeId());
}

void JWorkletRuntimeWrapper::registerNatives() {
  javaClassStatic()->registerNatives({});
  registerHybrid(
      {makeNativeMethod("cxxEmitDeviceEvent", JWorkletRuntimeWrapper::cxxEmitDeviceEvent),
       makeNativeMethod("cxxGetRuntimeId", JWorkletRuntimeWrapper::cxxGetRuntimeId)});
}
} // namespace worklets

#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
