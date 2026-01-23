#pragma once

#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)

#include <fbjni/fbjni.h>
#include <react/jni/ReadableNativeArray.h>
#include <react/jni/WritableNativeArray.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {

using namespace facebook;
using namespace facebook::react;
using namespace facebook::jni;

/**
    * JNI wrapper around WorkletRuntime to expose its methods to Java.
 */
class JWorkletRuntimeWrapper : public jni::HybridClass<JWorkletRuntimeWrapper> {
 public:
  constexpr static const char *const kJavaDescriptor = "Lcom/swmansion/worklets/WorkletRuntimeWrapper;";

  static local_ref<JWorkletRuntimeWrapper::JavaPart> makeJWorkletRuntimeWrapper(
      std::shared_ptr<WorkletRuntime> workletRuntime);

  static void registerNatives();

  void cxxEmitDeviceEvent(jni::alias_ref<WritableNativeArray::javaobject> params);
  int cxxGetRuntimeId();

 private:
  friend HybridBase;

  JWorkletRuntimeWrapper(std::shared_ptr<WorkletRuntime> workletRuntime, uint64_t runtimeId);

  const std::shared_ptr<WorkletRuntime> workletRuntime_;
};

} // namespace worklets

#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
