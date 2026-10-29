#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/Tools/FeatureFlags.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/Tools/WorkletsVersion.h>
#include <worklets/WorkletRuntime/HermesProfiling.h>
#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/WorkletRuntime/RuntimeIdentity.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>

#include <algorithm>
#include <memory>
#include <mutex>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

namespace {

struct ReloadStash {
  std::mutex mutex;
  std::vector<std::shared_ptr<Serializable>> values;
  std::vector<std::weak_ptr<Serializable>> taken;
};

ReloadStash &getReloadStash() {
  static ReloadStash stash;
  return stash;
}

} // namespace

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    jsi::Object &&jsiWorkletsModuleProxy,
    const std::shared_ptr<JSLogger> &jsLogger,
    const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus) {
  rnRuntime.global().setProperty(
      rnRuntime, RuntimeData::runtimeKindBindingName, static_cast<int>(RuntimeData::RuntimeKind::ReactNative));

  rnRuntime.global().setProperty(
      rnRuntime,
      RuntimeData::runtimeNameBindingName,
      jsi::String::createFromUtf8(rnRuntime, RuntimeData::rnRuntimeName));

  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

  rnRuntime.global().setProperty(rnRuntime, "__workletsModuleProxy", std::move(jsiWorkletsModuleProxy));

  WorkletRuntimeCollector::install(rnRuntime);
  setRNRuntimeIdentity(rnRuntime, rnRuntimeStatus);

#ifndef NDEBUG
  checkJSVersion(rnRuntime, jsLogger);
#endif // NDEBUG

#ifdef IS_REANIMATED_EXAMPLE_APP
  installDebugBindings(rnRuntime);
#endif // IS_REANIMATED_EXAMPLE_APP

  if constexpr (StaticFeatureFlags::getFlag("RUNTIME_TEST_FLAG")) {
    installReloadTestBindings(rnRuntime);
  }

  injectWorkletsCppVersion(rnRuntime);

  rnRuntime.global().setProperty(
      rnRuntime,
      "_startProfiling",
      jsi::Function::createFromHostFunction(
          rnRuntime,
          jsi::PropNameID::forAscii(rnRuntime, "_startProfiling"),
          1,
          [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
            const double meanHzFreq = (count > 0 && !args[0].isUndefined()) ? args[0].asNumber() : 100.0;
            startProfiling(rt, meanHzFreq);
            return jsi::Value::undefined();
          }));

  jsi_utils::installJsiFunction(rnRuntime, "_stopProfiling", [](jsi::Runtime &rt) {
    std::string path = stopProfiling(rt);
    return jsi::String::createFromUtf8(rt, path);
  });
}

void RNRuntimeWorkletDecorator::installReloadTestBindings(jsi::Runtime &rnRuntime) {
  jsi_utils::installJsiFunction(
      rnRuntime, "__stashSerializableForReload", [](jsi::Runtime &rt, const jsi::Value &value) {
        auto serializable =
            extractSerializableOrThrow(rt, value, "[Worklets] Only Serializables can be stashed for a reload.");
        auto &stash = getReloadStash();
        std::lock_guard lock(stash.mutex);
        stash.values.push_back(std::move(serializable));
        return jsi::Value::undefined();
      });

  jsi_utils::installJsiFunction(rnRuntime, "__takeSerializablesStashedForReload", [](jsi::Runtime &rt) {
    std::vector<std::shared_ptr<Serializable>> values;
    {
      auto &stash = getReloadStash();
      std::lock_guard lock(stash.mutex);
      values.swap(stash.values);
      stash.taken.assign(values.begin(), values.end());
    }
    auto array = jsi::Array(rt, values.size());
    for (size_t i = 0; i < values.size(); i++) {
      array.setValueAtIndex(rt, i, SerializableJSRef::newNativeStateObject(rt, values[i]));
    }
    return jsi::Value(std::move(array));
  });

  jsi_utils::installJsiFunction(rnRuntime, "__countLiveSerializablesTakenAfterReload", []() {
    auto &stash = getReloadStash();
    std::lock_guard lock(stash.mutex);
    return static_cast<double>(
        std::count_if(stash.taken.cbegin(), stash.taken.cend(), [](const auto &weak) { return !weak.expired(); }));
  });
}

#ifdef IS_REANIMATED_EXAMPLE_APP
void RNRuntimeWorkletDecorator::installDebugBindings(jsi::Runtime &rnRuntime) {
  jsi_utils::installJsiFunction(rnRuntime, "__hasNativeState", [](jsi::Runtime &rt, const jsi::Value &value) {
    return jsi::Value(value.isObject() && value.asObject(rt).hasNativeState(rt));
  });
}
#endif // IS_REANIMATED_EXAMPLE_APP

} // namespace worklets
